import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');
    const origin = req.nextUrl.origin;

    if (!url) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    const isResource = req.nextUrl.searchParams.get('resource') === 'true';


    if (isResource) {
        // Spoof User-Agent to avoid 403s
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
        };

        console.log(`[Proxy] Fetching resource: ${url}`);
        const response = await fetch(url, { headers });

        if (!response.ok) {
            console.error(`[Proxy] Failed to fetch resource: ${url} (${response.status})`);
            return new NextResponse(`Proxy error: ${response.status}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type');
        console.log(`[Proxy] Resource content-type: ${contentType}`);
        let buffer: any = await response.arrayBuffer();

        // Special handling for CSS: Rewrite relative URLs inside it
        if (contentType && contentType.includes('text/css')) {
            const originalCss = new TextDecoder().decode(buffer);
            const baseUrl = new URL(url);

            // 1. Rewrite @import "..." and @import url(...)
            let rewrittenCss = originalCss.replace(/@import\s+(?:url\((['"]?)(.*?)\1\)|(['"])(.*?)\3)([^;]*);/gi, (match, quote1, path1, quote2, path2, extras) => {
                const path = path1 || path2;
                if (!path) return match;

                try {
                    // Check for absolute/data
                    if (path.trim().startsWith('data:') || path.trim().startsWith('#')) return match;

                    let absoluteUrl = path.trim();
                    if (!absoluteUrl.startsWith('http')) {
                        absoluteUrl = new URL(absoluteUrl, baseUrl).toString();
                    }

                    const proxyUrl = `${origin}/api/proxy?url=${encodeURIComponent(absoluteUrl)}&resource=true`;
                    return `@import url("${proxyUrl}")${extras || ''};`;
                } catch (e) {
                    return match;
                }
            });

            // 2. Rewrite background-image: url(...) and others
            rewrittenCss = rewrittenCss.replace(/url\((['"]?)(.*?)\1\)/gi, (match, quote, path) => {
                if (!path || path.trim().startsWith('data:') || path.trim().startsWith('#')) return match;

                try {
                    let absoluteUrl = path.trim();
                    if (!absoluteUrl.startsWith('http')) {
                        absoluteUrl = new URL(absoluteUrl, baseUrl).toString();
                    }

                    return `url(${quote}${origin}/api/proxy?url=${encodeURIComponent(absoluteUrl)}&resource=true${quote})`;
                } catch (e) {
                    return match;
                }
            });

            buffer = Buffer.from(rewrittenCss);
        }

        return new NextResponse(buffer as any, {
            headers: {
                'Content-Type': contentType || 'application/octet-stream',
                'Access-Control-Allow-Origin': '*',
            }
        });
    }

    // 2. Main Page Fetch (HTML) if not a resource
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1'
    };

    console.log(`[Proxy] Fetching HTML: ${url}`);
    const response = await fetch(url, { headers });

    if (!response.ok) {
        console.error(`[Proxy] Failed to fetch HTML: ${url} (${response.status})`);
        return new NextResponse(`Proxy error: ${response.status}`, { status: response.status });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = new URL(url);

    // Helper to rewrite URLs
    const proxyResource = (target: string) => {
        if (!target) return target;
        if (target.startsWith('data:')) return target;
        if (target.startsWith('#')) return target;

        try {
            // Resolve relative URLs against the base URL
            const absoluteUrl = new URL(target, baseUrl).toString();
            // Return our proxy URL
            return `${origin}/api/proxy?url=${encodeURIComponent(absoluteUrl)}&resource=true`;
        } catch (e) {
            return target;
        }
    };

    // Helper for srcset
    const proxySrcset = (srcset: string) => {
        if (!srcset) return srcset;
        return srcset.split(',').map(part => {
            const [url, descriptor] = part.trim().split(/\s+/);
            if (url) {
                return `${proxyResource(url)} ${descriptor || ''}`.trim();
            }
            return part;
        }).join(', ');
    };

    const cssLinks = $('link[rel="stylesheet"], link[rel="preload"], link[rel="modulepreload"]');
    console.log(`[Proxy] Found ${cssLinks.length} potential stylesheets/preloads`);

    // Rewrite Stylesheets and Preloads
    cssLinks.each((_, el) => {
        const href = $(el).attr('href');
        $(el).removeAttr('integrity');
        $(el).removeAttr('crossorigin');

        if (href) {
            const proxied = proxyResource(href);
            console.log(`[Proxy] Rewrote stylesheet: ${href} -> ${proxied}`);
            $(el).attr('href', proxied);
        }
    });

    // Rewrite Scripts
    $('script[src]').each((_, el) => {
        const src = $(el).attr('src');
        $(el).removeAttr('integrity');
        $(el).removeAttr('crossorigin');
        if (src) {
            $(el).attr('src', proxyResource(src));
        }
    });

    // Rewrite Images (src and srcset)
    $('img').each((_, el) => {
        const src = $(el).attr('src');
        const srcset = $(el).attr('srcset');

        if (src) $(el).attr('src', proxyResource(src));
        if (srcset) $(el).attr('srcset', proxySrcset(srcset));
    });

    // Rewrite Source tags (in picture/video/audio)
    $('source').each((_, el) => {
        const src = $(el).attr('src');
        const srcset = $(el).attr('srcset');

        if (src) $(el).attr('src', proxyResource(src));
        if (srcset) $(el).attr('srcset', proxySrcset(srcset));
    });

    // Rewrite Icons (favicons, etc)
    $('link[rel*="icon"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
            $(el).attr('href', proxyResource(href));
        }
    });

    // Rewrite Inline Styles (background-images)
    $('*[style]').each((_, el) => {
        const style = $(el).attr('style');
        if (style && style.includes('url(')) {
            const newStyle = style.replace(/url\((['"]?)(.*?)\1\)/gi, (match, quote, path) => {
                if (!path || path.trim().startsWith('data:') || path.trim().startsWith('#')) return match;
                try {
                    let absoluteUrl = path.trim();
                    if (!path.startsWith('http')) absoluteUrl = new URL(path, baseUrl).toString();
                    return `url(${quote}${origin}/api/proxy?url=${encodeURIComponent(absoluteUrl)}&resource=true${quote})`;
                } catch (e) { return match; }
            });
            $(el).attr('style', newStyle);
        }
    });

    // Remove CSP Meta Tags preventing our script or proxied assets
    $('meta[http-equiv="Content-Security-Policy"]').remove();

    // Ensure <base> tag exists for any other relative links (a tags)
    if ($('base').length === 0) {
        $('head').prepend(`<base href="${url}">`);
    } else {
        $('base').attr('href', url);
    }

    // Inject Translation Script
    $('body').append(`<script src="${origin}/translation-script.js"></script>`);

    return new NextResponse($.html(), {
        headers: {
            'Content-Type': 'text/html',
        },
    });


}
