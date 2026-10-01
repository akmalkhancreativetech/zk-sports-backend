<?php

namespace App\Enums;

/**
 * The quotation workflow from plan.md §7.2.
 *
 * Transitions live here rather than in the controller so every caller — HTTP,
 * seeder, future intake API — is held to the same graph. The React select is a
 * projection of `allowedTransitions()`, never the source of truth.
 */
enum OrderStatus: string
{
    case New = 'new';

    case Reviewing = 'reviewing';

    case Quoted = 'quoted';

    case Approved = 'approved';

    case InProgress = 'in_progress';

    case Completed = 'completed';

    case Cancelled = 'cancelled';

    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::New => 'New',
            self::Reviewing => 'Reviewing',
            self::Quoted => 'Quoted',
            self::Approved => 'Approved',
            self::InProgress => 'In progress',
            self::Completed => 'Completed',
            self::Cancelled => 'Cancelled',
            self::Rejected => 'Rejected',
        };
    }

    /**
     * The states reachable from this one. Terminal states return an empty array,
     * which is what disables the status control in the UI.
     *
     * @return array<int, self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::New => [self::Reviewing, self::Cancelled],
            self::Reviewing => [self::Quoted, self::Cancelled],
            self::Quoted => [self::Approved, self::Rejected, self::Cancelled],
            self::Approved => [self::InProgress, self::Cancelled],
            self::InProgress => [self::Completed, self::Cancelled],
            self::Completed, self::Cancelled, self::Rejected => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
    }

    public function isTerminal(): bool
    {
        return $this->allowedTransitions() === [];
    }

    /**
     * The timestamp column this status stamps on entry, if any.
     */
    public function timestampColumn(): ?string
    {
        return match ($this) {
            self::Quoted => 'quoted_at',
            self::Approved => 'approved_at',
            self::Completed => 'completed_at',
            default => null,
        };
    }

    /**
     * A `StatusTone` for the shared StatusBadge. The pill always carries its
     * label too — colour alone fails for colourblind users.
     */
    public function tone(): string
    {
        return match ($this) {
            self::New, self::Reviewing, self::Approved => 'info',
            self::Quoted, self::InProgress => 'warning',
            self::Completed => 'success',
            self::Rejected => 'danger',
            self::Cancelled => 'neutral',
        };
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case) => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }
}
