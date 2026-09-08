<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Converts uploads to WebP and caps their long edge, using the native GD
 * extension so no image package is required.
 *
 * Enforced at upload rather than at render: a 12MB hero PNG that reaches disk
 * is already an LCP problem (plan.md §11 risk 7).
 */
class ImageProcessor
{
    public const MAX_LONG_EDGE = 2560;

    public const QUALITY = 82;

    /**
     * Store an upload as WebP on the given disk and return its relative path.
     */
    public function store(
        UploadedFile $file,
        string $directory,
        string $disk = 'public',
        int $maxLongEdge = self::MAX_LONG_EDGE,
    ): string {
        $source = @imagecreatefromstring((string) $file->get());

        if ($source === false) {
            throw new RuntimeException('The uploaded file is not a readable image.');
        }

        try {
            $image = $this->scaleDown($source, $maxLongEdge);

            // GD writes WebP to a path, not a stream, so buffer it instead of
            // making a temp file we would then have to clean up.
            ob_start();
            $written = imagewebp($image, null, self::QUALITY);
            $contents = (string) ob_get_clean();

            if (! $written || $contents === '') {
                throw new RuntimeException('Failed to encode the image as WebP.');
            }

            $path = trim($directory, '/').'/'.Str::ulid().'.webp';
            Storage::disk($disk)->put($path, $contents);

            return $path;
        } finally {
            imagedestroy($source);

            if (isset($image) && $image !== $source) {
                imagedestroy($image);
            }
        }
    }

    /**
     * Delete a previously stored image, ignoring one that is already gone.
     */
    public function delete(?string $path, string $disk = 'public'): void
    {
        if ($path) {
            Storage::disk($disk)->delete($path);
        }
    }

    /**
     * @param  \GdImage  $source
     * @return \GdImage
     */
    private function scaleDown($source, int $maxLongEdge)
    {
        $width = imagesx($source);
        $height = imagesy($source);
        $longEdge = max($width, $height);

        if ($longEdge <= $maxLongEdge) {
            return $source;
        }

        $ratio = $maxLongEdge / $longEdge;
        $targetWidth = max(1, (int) round($width * $ratio));
        $targetHeight = max(1, (int) round($height * $ratio));

        $resized = imagecreatetruecolor($targetWidth, $targetHeight);

        // Preserve transparency through the resample.
        imagealphablending($resized, false);
        imagesavealpha($resized, true);

        imagecopyresampled(
            $resized,
            $source,
            0, 0, 0, 0,
            $targetWidth,
            $targetHeight,
            $width,
            $height,
        );

        return $resized;
    }
}
