import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

interface OrderLocation {
    id: string;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
}

interface OptimizedRoute {
    orderedIds: string[];
    totalDistance: number;
    totalDuration: number;
    formattedDistance: string;
    formattedDuration: string;
    googleMapsUrl: string;
    waypoints: Array<{
        orderId: string;
        address: string;
        coords?: { lat: number; lng: number };
    }>;
}

// Calculate distance between two points using Haversine formula
function haversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Nearest neighbor algorithm for route optimization
function optimizeRouteNearestNeighbor(
    startPoint: { lat: number; lng: number },
    locations: Array<{ id: string; lat: number; lng: number; address: string }>
): Array<{ id: string; lat: number; lng: number; address: string }> {
    if (locations.length === 0) return [];
    if (locations.length === 1) return [locations[0]];

    const visited = new Set<string>();
    const route: typeof locations = [];
    let currentPoint = startPoint;

    while (visited.size < locations.length) {
        let nearestLoc: typeof locations[0] | null = null;
        let nearestDistance = Infinity;

        for (const loc of locations) {
            if (visited.has(loc.id)) continue;

            const distance = haversineDistance(
                currentPoint.lat, currentPoint.lng,
                loc.lat, loc.lng
            );

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestLoc = loc;
            }
        }

        if (nearestLoc) {
            visited.add(nearestLoc.id);
            route.push(nearestLoc);
            currentPoint = { lat: nearestLoc.lat, lng: nearestLoc.lng };
        }
    }

    return route;
}

// Helper to extract coordinates from various Google Maps URL formats or strings
function extractCoordinatesFromInput(input: string): { lat: number, lng: number } | null {
    if (!input) return null;

    // Pattern 1: @lat,lng (common in maps urls)
    const atMatch = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

    // Pattern 2: q=lat,lng or ll=lat,lng
    const qMatch = input.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

    // Pattern 3: Just "lat,lng" or "lat, lng"
    const simpleMatch = input.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
    if (simpleMatch) return { lat: parseFloat(simpleMatch[1]), lng: parseFloat(simpleMatch[2]) };

    return null;
}

// Build Google Maps URL with waypoints
function buildGoogleMapsUrl(
    startPoint: { lat: number; lng: number } | null,
    waypoints: Array<{ lat?: number; lng?: number; address: string }>,
    unoptimizedAddresses: string[] = [] // Addresses without coords
): string {
    // Base URL
    // https://www.google.com/maps/dir/origin/waypoint1/waypoint2/.../destination

    const parts: string[] = [];

    // 1. Start point
    if (startPoint) {
        parts.push(`${startPoint.lat},${startPoint.lng}`);
    }

    // 2. Optimized waypoints (which have coords)
    waypoints.forEach(wp => {
        if (wp.lat && wp.lng) {
            parts.push(`${wp.lat},${wp.lng}`);
        } else {
            // Fallback to address if coords missing in this list (unlikely for optimized list)
            parts.push(encodeURIComponent(wp.address));
        }
    });

    // 3. Append unoptimized addresses at the end
    // These are locations we couldn't sort, so we just add them to the route list
    unoptimizedAddresses.forEach(addr => {
        parts.push(encodeURIComponent(addr));
    });

    if (parts.length === 0) return 'https://www.google.com/maps';

    const path = parts.join('/');
    return `https://www.google.com/maps/dir/${path}`;
}

// POST - Optimize route for given orders
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { orders, startPoint } = body;

        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            return NextResponse.json({ error: 'No orders provided' }, { status: 400 });
        }

        // Process orders: try to find coords for everyone
        const processedOrders = orders.map((o: OrderLocation) => {
            // If we already have explicit coords, use them
            if (o.latitude != null && o.longitude != null) {
                return { ...o, hasCoords: true };
            }

            // Try to extract from address string (URL or "lat,lng")
            const extracted = extractCoordinatesFromInput(o.address);
            if (extracted) {
                return {
                    ...o,
                    latitude: extracted.lat,
                    longitude: extracted.lng,
                    hasCoords: true
                };
            }

            // No coords found
            return { ...o, hasCoords: false };
        });

        // Separate into optimizable (with coords) and others
        const validOrders = processedOrders.filter((o: any) => o.hasCoords);
        const dateOrders = processedOrders.filter((o: any) => !o.hasCoords);

        // Default start point
        const start = startPoint || { lat: 41.2995, lng: 69.2401 };

        // Prepare locations for optimization
        const locations = validOrders.map((o: any) => ({
            id: o.id,
            lat: o.latitude!,
            lng: o.longitude!,
            address: o.address
        }));

        // Optimize route
        const optimizedLocations = optimizeRouteNearestNeighbor(start, locations);

        // Calculate stats
        let totalDistance = 0;
        let currentPoint = start;

        for (const loc of optimizedLocations) {
            totalDistance += haversineDistance(
                currentPoint.lat, currentPoint.lng,
                loc.lat, loc.lng
            );
            currentPoint = { lat: loc.lat, lng: loc.lng };
        }

        // Build Google Maps URL including BOTH optimized points and unoptimized addresses
        const googleMapsUrl = buildGoogleMapsUrl(
            start,
            optimizedLocations.map(loc => ({
                lat: loc.lat,
                lng: loc.lng,
                address: loc.address
            })),
            dateOrders.map((o: any) => o.address) // Append these addresses to the URL
        );

        const allOrderedIds = [
            ...optimizedLocations.map(loc => loc.id),
            ...dateOrders.map((o: any) => o.id)
        ];

        const estimatedDuration = (totalDistance / 25) * 60; // minutes

        const result: OptimizedRoute = {
            orderedIds: allOrderedIds,
            totalDistance: Math.round(totalDistance * 10) / 10,
            totalDuration: Math.round(estimatedDuration),
            formattedDistance: `${Math.round(totalDistance * 10) / 10} км`,
            formattedDuration: formatDuration(estimatedDuration),
            googleMapsUrl,
            waypoints: [
                ...optimizedLocations.map(loc => ({
                    orderId: loc.id,
                    address: loc.address,
                    coords: { lat: loc.lat, lng: loc.lng }
                })),
                ...dateOrders.map((o: any) => ({
                    orderId: o.id,
                    address: o.address, // We only have the address/link
                    coords: undefined
                }))
            ]
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error optimizing route:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${Math.round(minutes)} мин`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
}

// GET - Info about the route optimization service
export async function GET(_request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({
            service: 'Route Optimization API',
            description: 'Оптимизирует порядок доставки используя алгоритм ближайшего соседа и открывает маршрут в Google Maps',
            supportedMethods: ['POST'],
            parameters: {
                orders: 'Array of orders with id, address, latitude, longitude',
                startPoint: 'Optional { lat, lng } for starting point'
            },
            features: [
                'No API key required',
                'Haversine distance calculation',
                'Nearest neighbor optimization',
                'Google Maps URL generation'
            ]
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
