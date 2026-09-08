export const routes = {
  dashboard: '/admin',

  auth: {
    login: '/login',
    logout: '/logout',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
    confirmPassword: '/user/confirm-password',
  },

  sliders: {
    index: '/admin/sliders',
    create: '/admin/sliders/create',
    store: '/admin/sliders',
    bulk: '/admin/sliders/bulk',
    edit: (id: number | string) => `/admin/sliders/${id}/edit`,
    preview: (id: number | string) => `/admin/sliders/${id}/preview`,
    update: (id: number | string) => `/admin/sliders/${id}`,
    destroy: (id: number | string) => `/admin/sliders/${id}`,
    slides: {
      store: (sliderId: number | string) => `/admin/sliders/${sliderId}/slides`,
      update: (sliderId: number | string, id: number | string) =>
        `/admin/sliders/${sliderId}/slides/${id}`,
      destroy: (sliderId: number | string, id: number | string) =>
        `/admin/sliders/${sliderId}/slides/${id}`,
      reorder: (sliderId: number | string) => `/admin/sliders/${sliderId}/slides/reorder`,
    },
  },

  services: {
    index: '/admin/services',
    create: '/admin/services/create',
    store: '/admin/services',
    bulk: '/admin/services/bulk',
    reorder: '/admin/services/reorder',
    edit: (id: number | string) => `/admin/services/${id}/edit`,
    update: (id: number | string) => `/admin/services/${id}`,
    destroy: (id: number | string) => `/admin/services/${id}`,
    options: (id: number | string) => `/admin/services/${id}/options`,
    priceTiers: (id: number | string) => `/admin/services/${id}/price-tiers`,
    images: {
      store: (serviceId: number | string) => `/admin/services/${serviceId}/images`,
      update: (serviceId: number | string, id: number | string) =>
        `/admin/services/${serviceId}/images/${id}`,
      destroy: (serviceId: number | string, id: number | string) =>
        `/admin/services/${serviceId}/images/${id}`,
    },
    categories: {
      index: '/admin/service-categories',
      store: '/admin/service-categories',
      update: (id: number | string) => `/admin/service-categories/${id}`,
      destroy: (id: number | string) => `/admin/service-categories/${id}`,
    },
  },

  // Remaining CRUD shape lands with each module (plan.md §2.2); the nav needs
  // only the index URLs for now.
  blog: {
    posts: { index: '/admin/blog/posts' },
    categories: { index: '/admin/blog/categories' },
    tags: { index: '/admin/blog/tags' },
  },
  orders: {
    index: '/admin/orders',
    show: (id: number | string) => `/admin/orders/${id}`,
    updateStatus: (id: number | string) => `/admin/orders/${id}/status`,
    destroy: (id: number | string) => `/admin/orders/${id}`,
  },
  settings: {
    index: '/admin/settings',
    // Fortify owns the writes.
    profile: '/user/profile-information',
    password: '/user/password',
  },
} as const;
