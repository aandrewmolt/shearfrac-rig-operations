
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cable, Package, ArrowRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';

const MainDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <AppHeader />
      
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Rig-Up Management</h1>
            <p className="text-xl text-gray-600 mb-6">
              Manage your jobs, equipment inventory, and contacts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow bg-white border-2 hover:border-blue-300"
              onClick={() => navigate('/jobs')}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-fit">
                  <Cable className="h-12 w-12 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Job Mapper</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">
                  Create visual diagrams for your well configurations
                </p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Open Job Mapper
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow bg-white border-2 hover:border-green-300"
              onClick={() => navigate('/inventory/equipment')}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-fit">
                  <Package className="h-12 w-12 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Equipment Inventory</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">
                  Track equipment across storage locations and job sites
                </p>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Open Inventory
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow bg-white border-2 hover:border-purple-300"
              onClick={() => navigate('/contacts')}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-purple-100 rounded-full w-fit">
                  <Users className="h-12 w-12 text-purple-600" />
                </div>
                <CardTitle className="text-2xl">Contacts</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">
                  Manage client, frac, and custom contacts
                </p>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Open Contacts
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
