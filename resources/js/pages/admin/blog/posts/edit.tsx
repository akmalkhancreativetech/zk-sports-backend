import { ArrowLeftIcon } from 'lucide-react';

import { PostForm } from '@/components/admin/post-form';
import { LinkButton } from '@/components/link-button';
import AdminLayout from '@/layouts/admin-layout';
import { routes } from '@/lib/routes';
import type { BlogPost, EnumOption } from '@/types/models';

interface Props {
    post: BlogPost;
    categories: EnumOption[];
    tags: EnumOption[];
}

export default function EditPost({ post, categories, tags }: Props) {
    return (
        <AdminLayout
            title={post.title}
            description={`Slug: ${post.slug}`}
            actions={
                <LinkButton href={routes.blog.posts.index} variant="outline">
                    <ArrowLeftIcon className="size-4" />
                    Back to posts
                </LinkButton>
            }
        >
            <PostForm post={post} categories={categories} tags={tags} />
        </AdminLayout>
    );
}
