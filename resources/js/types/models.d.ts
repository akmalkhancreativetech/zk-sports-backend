/** Laravel's length-aware paginator, as it arrives through Inertia. */
export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
    prev_page_url: string | null;
    next_page_url: string | null;
}

export interface TableFilters {
    search: string | null;
    sort: string;
    direction: 'asc' | 'desc';
    /** Extra select filters, keyed exactly as the controller returns them. */
    [extra: string]: string | null | undefined;
}

/** Value/label pair for a PHP enum exposed to a select. */
export interface EnumOption {
    value: string;
    label: string;
}

export type SliderTransition = 'slide' | 'fade';
export type SlideTextPosition = 'left' | 'center' | 'right';

export interface SliderListItem {
    id: number;
    name: string;
    key: string;
    is_active: boolean;
    slides_count: number;
    updated_at: string | null;
}

export interface Slider {
    id: number;
    name: string;
    key: string;
    is_active: boolean;
    autoplay: boolean;
    interval_ms: number;
    transition: SliderTransition;
}

/** A slide as the render path exposes it — no admin-only fields. */
export interface HeroSlide {
    id: number;
    title: string | null;
    subtitle: string | null;
    body: string | null;
    image_url: string | null;
    mobile_image_url: string | null;
    image_alt: string | null;
    cta_label: string | null;
    cta_url: string | null;
    cta_new_tab: boolean;
    text_position: SlideTextPosition;
    overlay_opacity: number;
}

/** The payload App\Services\PublicSliders returns. */
export interface HeroSlider {
    key: string;
    autoplay: boolean;
    interval_ms: number;
    transition: SliderTransition;
    slides: HeroSlide[];
}

export interface ServiceCategoryItem {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    sort_order: number;
    is_active: boolean;
    services_count: number;
}

export interface ServiceListItem {
    id: number;
    title: string;
    slug: string;
    category: string | null;
    price_from: string | null;
    price_unit: string | null;
    images_count: number;
    is_active: boolean;
    is_featured: boolean;
    sort_order: number;
    updated_at: string | null;
}

export interface Service {
    id: number;
    category_id: string | null;
    title: string;
    slug: string;
    excerpt: string | null;
    description: string | null;
    icon: string | null;
    featured_image_url: string | null;
    og_image_url: string | null;
    price_from: string | null;
    price_unit: string | null;
    min_order_quantity: number | null;
    is_featured: boolean;
    is_active: boolean;
    meta_title: string | null;
    meta_description: string | null;
}

export interface ServiceImage {
    id: number;
    url: string;
    alt: string | null;
    sort_order: number;
}

export type ServiceOptionType = 'select' | 'text';

export interface ServiceOptionValueInput {
    label: string;
    price_delta: string | null;
}

export interface ServiceOptionInput {
    name: string;
    type: ServiceOptionType;
    is_required: boolean;
    values: ServiceOptionValueInput[];
}

export interface ServicePriceTierInput {
    min_qty: number | string;
    max_qty: number | string | null;
    unit_price: string;
}

export interface Slide {
    id: number;
    title: string | null;
    subtitle: string | null;
    body: string | null;
    image_url: string | null;
    mobile_image_url: string | null;
    image_alt: string | null;
    cta_label: string | null;
    cta_url: string | null;
    cta_new_tab: boolean;
    text_position: SlideTextPosition;
    overlay_opacity: number;
    sort_order: number;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
}
