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

// Build Google Maps URL with waypoints
function buildGoogleMapsUrl(
    startPoint: { lat: number; lng: number } | null,
    waypoints: Array<{ lat: number; lng: number; address: string }>
): string {
    if (waypoints.length === 0) return 'https://www.google.com/maps';

    // For Google Maps directions URL:
    // https://www.google.com/maps/dir/origin/waypoint1/waypoint2/.../destination

    const parts: string[] = [];

    // Add start point if available
    if (startPoint) {
        parts.push(`${startPoint.lat},${startPoint.lng}`);
    }

    // Add all waypoints
    waypoints.forEach(wp => {
        // Use coordinates if available, otherwise use address
        parts.push(`${wp.lat},${wp.lng}`);
    });

    // Build the URL
    const path = parts.map(p => encodeURIComponent(p)).join('/');
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

        // Filter orders with valid coordinates
        const validOrders = orders.filter(
            (o: OrderLocation) => o.latitude != null && o.longitude != null
        );

        if (validOrders.length === 0) {
            return NextResponse.json({
                error: 'No orders with valid coordinates',
                orderedIds: orders.map((o: OrderLocation) => o.id),
                googleMapsUrl: 'https://www.google.com/maps',
                waypoints: []
            }, { status: 200 });
        }

        // Default start point (Tashkent center if not provided)
        const start = startPoint || { lat: 41.2995, lng: 69.2401 };

        // Prepare locations
        const locations = validOrders.map((o: OrderLocation) => ({
            id: o.id,
            lat: o.latitude!,
            lng: o.longitude!,
            address: o.address
        }));

        // Optimize route using nearest neighbor algorithm
        const optimizedLocations = optimizeRouteNearestNeighbor(start, locations);

        // Calculate total distance
        let totalDistance = 0;
        let currentPoint = start;

        for (const loc of optimizedLocations) {
            totalDistance += haversineDistance(
                currentPoint.lat, currentPoint.lng,
                loc.lat, loc.lng
            );
            currentPoint = { lat: loc.lat, lng: loc.lng };
        }

        // Build Google Maps URL with optimized waypoints
        const googleMapsUrl = buildGoogleMapsUrl(
            start,
            optimizedLocations.map(loc => ({
                lat: loc.lat,
                lng: loc.lng,
                address: loc.address
            }))
        );

        // Add orders without coordinates at the end
        const ordersWithoutCoords = orders
            .filter((o: OrderLocation) => o.latitude == null || o.longitude == null)
            .map((o: OrderLocation) => o.id);

        const allOrderedIds = [
            ...optimizedLocations.map(loc => loc.id),
            ...ordersWithoutCoords
        ];

        // Estimate duration (assuming 25 km/h average speed in city traffic)
        const estimatedDuration = (totalDistance / 25) * 60; // minutes

        const result: OptimizedRoute = {
            orderedIds: allOrderedIds,
            totalDistance: Math.round(totalDistance * 10) / 10,
            totalDuration: Math.round(estimatedDuration),
            formattedDistance: `${Math.round(totalDistance * 10) / 10} км`,
            formattedDuration: formatDuration(estimatedDuration),
            googleMapsUrl,
            waypoints: optimizedLocations.map(loc => ({
                orderId: loc.id,
                address: loc.address,
                coords: { lat: loc.lat, lng: loc.lng }
            }))
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
export async function GET(request: NextRequest) {
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
