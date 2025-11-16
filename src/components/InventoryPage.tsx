import React from 'react';
import { Package, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function InventoryPage() {
  const mockInventory = [
    { id: 1, name: 'IV Pumps', category: 'Medical Equipment', quantity: 45, status: 'In Stock', location: 'Storage A' },
    { id: 2, name: 'Wheelchairs', category: 'Mobility', quantity: 12, status: 'Low Stock', location: 'Storage B' },
    { id: 3, name: 'Oxygen Tanks', category: 'Respiratory', quantity: 28, status: 'In Stock', location: 'Storage C' },
    { id: 4, name: 'Hospital Beds', category: 'Furniture', quantity: 8, status: 'Low Stock', location: 'Storage A' },
    { id: 5, name: 'Monitors', category: 'Medical Equipment', quantity: 34, status: 'In Stock', location: 'Storage D' },
  ];

  const getStatusColor = (status: string) => {
    return status === 'In Stock' ? 'bg-green-500' : 'bg-yellow-500';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search and Filter Bar */}
      <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--border-light))' }}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search inventory..." 
              className="pl-10"
            />
          </div>
          <button className="px-3 py-2 rounded-md border hover:bg-gray-50 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filter</span>
          </button>
        </div>
      </div>

      {/* Inventory List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mockInventory.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold">{item.name}</CardTitle>
                </div>
                <Badge className={`${getStatusColor(item.status)} text-white text-xs`}>
                  {item.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">{item.category}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantity:</span>
                  <p className="font-medium">{item.quantity}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Location:</span>
                  <p className="font-medium">{item.location}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

