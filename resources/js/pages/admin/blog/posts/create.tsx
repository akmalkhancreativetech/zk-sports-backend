import { ArrowLeftIcon } from 'lucide-react';

import { PostForm } from '@/components/admin/post-form';
import { LinkButton } from '@/components/link-button';
import AdminLayout from '@/layouts/admin-layout';
import { routes } from '@/lib/routes';
import type { EnumOption } from '@/types/models';

interface Props {
    categories: EnumOption[];
    tags: EnumOption[];
}

export default function CreatePost({ categories, tags }: Props) {
    return (
        <AdminLayout
            title="New post"
            description="Drafts stay hidden until you publish them."
            actions={
                <LinkButton href={routes.blog.posts.index} variant="outline">
                    <ArrowLeftIcon className="size-4" />
                    Back to posts
                </LinkButton>
            }
        >
            <PostForm categories={categories} tags={tags} />
        </AdminLayout>
    );
}
