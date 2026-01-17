'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Route, Loader2, MapPin, Clock, Navigation, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
    id: string;
    deliveryAddress: string;
    latitude?: number | null;
    longitude?: number | null;
    customerName?: string;
    customer?: { name: string };
}

interface RouteOptimizeButtonProps {
    orders: Order[];
    onOptimized: (orderedIds: string[]) => void;
    startPoint?: { lat: number; lng: number };
    className?: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    showLabel?: boolean;
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

export function RouteOptimizeButton({
    orders,
    onOptimized,
    startPoint,
    className,
    variant = 'outline',
    size = 'default',
    showLabel = true
}: RouteOptimizeButtonProps) {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);

    const handleOptimize = async () => {
        if (orders.length === 0) {
            toast.error('Нет заказов для оптимизации');
            return;
        }

        // Check how many orders have coordinates
        const ordersWithCoords = orders.filter(o => o.latitude != null && o.longitude != null);

        if (ordersWithCoords.length === 0) {
            toast.error('Нет заказов с координатами для оптимизации маршрута');
            return;
        }

        if (ordersWithCoords.length < orders.length) {
            toast.warning(`${orders.length - ordersWithCoords.length} заказов без координат будут добавлены в конец`);
        }

        setIsOptimizing(true);

        try {
            const response = await fetch('/api/admin/route-optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orders: orders.map(o => ({
                        id: o.id,
                        address: o.deliveryAddress,
                        latitude: o.latitude,
                        longitude: o.longitude
                    })),
                    startPoint
                })
            });

            if (!response.ok) {
                throw new Error('Failed to optimize route');
            }

            const result: OptimizedRoute = await response.json();

            setOptimizedRoute(result);
            setShowRouteModal(true);

            // Apply the optimization
            onOptimized(result.orderedIds);

            toast.success(
                `Маршрут оптимизирован! ${result.formattedDistance}, ~${result.formattedDuration}`,
                { duration: 4000 }
            );
        } catch (error) {
            console.error('Route optimization error:', error);
            toast.error('Ошибка оптимизации маршрута');
        } finally {
            setIsOptimizing(false);
        }
    };

    const getOrderName = (orderId: string): string => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return 'Клиент';
        return order.customerName || order.customer?.name || 'Клиент';
    };

    const openGoogleMaps = () => {
        if (optimizedRoute?.googleMapsUrl) {
            window.open(optimizedRoute.googleMapsUrl, '_blank');
        }
    };

    return (
        <>
            <Button
                variant={variant}
                size={size}
                onClick={handleOptimize}
                disabled={isOptimizing || orders.length === 0}
                className={className}
            >
                {isOptimizing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Route className="w-4 h-4" />
                )}
                {showLabel && (
                    <span className="ml-2">
                        {isOptimizing ? 'Оптимизация...' : 'Сортировать'}
                    </span>
                )}
            </Button>

            {/* Route Details Modal */}
            <Dialog open={showRouteModal} onOpenChange={setShowRouteModal}>
                <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            Маршрут оптимизирован
                        </DialogTitle>
                        <DialogDescription>
                            Заказы отсортированы по оптимальному маршруту
                        </DialogDescription>
                    </DialogHeader>

                    {optimizedRoute && (
                        <div className="flex-1 overflow-hidden flex flex-col gap-4">
                            {/* Route Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 rounded-xl p-4 text-center">
                                    <Navigation className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                                    <div className="text-xl font-bold text-blue-700">
                                        {optimizedRoute.formattedDistance}
                                    </div>
                                    <div className="text-xs text-blue-600">Общая дистанция</div>
                                </div>
                                <div className="bg-green-50 rounded-xl p-4 text-center">
                                    <Clock className="w-6 h-6 mx-auto text-green-600 mb-1" />
                                    <div className="text-xl font-bold text-green-700">
                                        {optimizedRoute.formattedDuration}
                                    </div>
                                    <div className="text-xs text-green-600">Примерное время</div>
                                </div>
                            </div>

                            {/* Open in Google Maps - Main CTA */}
                            <Button
                                size="lg"
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
                                onClick={openGoogleMaps}
                            >
                                <MapPin className="w-5 h-5 mr-2" />
                                Открыть в Google Maps
                                <ExternalLink className="w-4 h-4 ml-2" />
                            </Button>

                            {/* Waypoints List */}
                            <div className="flex-1 overflow-auto">
                                <h4 className="text-sm font-medium text-slate-700 mb-2 sticky top-0 bg-white py-1">
                                    Порядок доставки ({optimizedRoute.waypoints.length} точек):
                                </h4>
                                <div className="space-y-2">
                                    {optimizedRoute.waypoints.map((waypoint, index) => (
                                        <div
                                            key={waypoint.orderId}
                                            className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold flex items-center justify-center shadow-sm">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">
                                                    {getOrderName(waypoint.orderId)}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate flex items-center">
                                                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                                    {waypoint.address}
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Orders without coordinates */}
                                    {optimizedRoute.orderedIds.length > optimizedRoute.waypoints.length && (
                                        <>
                                            <div className="text-xs text-slate-400 mt-4 mb-2 flex items-center">
                                                <div className="flex-1 h-px bg-slate-200" />
                                                <span className="px-2">Без координат</span>
                                                <div className="flex-1 h-px bg-slate-200" />
                                            </div>
                                            {optimizedRoute.orderedIds
                                                .slice(optimizedRoute.waypoints.length)
                                                .map((orderId, index) => (
                                                    <div
                                                        key={orderId}
                                                        className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100"
                                                    >
                                                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-400 text-white text-sm font-bold flex items-center justify-center">
                                                            {optimizedRoute.waypoints.length + index + 1}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                                {getOrderName(orderId)}
                                                            </p>
                                                            <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200 mt-1">
                                                                Нужно указать адрес на карте
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Secondary action */}
                            <div className="pt-2 border-t border-slate-100">
                                <p className="text-xs text-center text-slate-400">
                                    Заказы отсортированы • Нажмите на кнопку выше для навигации
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
