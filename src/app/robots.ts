import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/super-admin/', '/middle-admin/', '/low-admin/'],
        },
        sitemap: 'https://autofood.uz/sitemap.xml',
    }
}
