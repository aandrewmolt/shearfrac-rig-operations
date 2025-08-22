
import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Square } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobs } from '@/hooks/useJobs';
import NodeDeleteButton from './NodeDeleteButton';
import { SimpleRedTagMenu } from './SimpleRedTagMenu';

const MainBoxNode = ({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
  const { getNodes, setNodes, deleteElements } = useReactFlow();
  const { saveJob } = useJobs();
  const [fracDataPort, setFracDataPort] = useState<string>(data.fracComPort || '');
  const [gaugeDataPort, setGaugeDataPort] = useState<string>(data.gaugeComPort || '');
  const [fracBaudRate, setFracBaudRate] = useState<string>(data.fracBaudRate || '19200');
  const [gaugeBaudRate, setGaugeBaudRate] = useState<string>(data.gaugeBaudRate || '9600');

  // Enhanced update node data function with immediate persistence
  const updateNodeData = (updates: any) => {
    console.log('Enhanced MainBoxNode data update:', { id, updates, currentData: data });
    
    setNodes((nodes) => {
      const updatedNodes = nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            }
          : node
      );
      
      console.log('Nodes updated with COM port data:', {
        nodeId: id,
        updates,
        updatedNode: updatedNodes.find(n => n.id === id)?.data
      });
      
      return updatedNodes;
    });
  };

  // Enhanced frac data port change handler
  const handleFracDataPortChange = (value: string) => {
    console.log('Enhanced frac COM port change:', { from: fracDataPort, to: value });
    setFracDataPort(value);
    
    // If ColdBore is selected, clear the baud rate
    if (value === 'coldbore') {
      setFracBaudRate('');
      updateNodeData({ fracComPort: value, fracBaudRate: '' });
    } else {
      // If switching from ColdBore to a COM port, set default baud rate
      if (fracDataPort === 'coldbore' && !fracBaudRate) {
        setFracBaudRate('19200');
        updateNodeData({ fracComPort: value, fracBaudRate: '19200' });
      } else {
        updateNodeData({ fracComPort: value });
      }
    }
  };

  // Enhanced gauge data port change handler
  const handleGaugeDataPortChange = (value: string) => {
    console.log('Enhanced gauge COM port change:', { from: gaugeDataPort, to: value });
    setGaugeDataPort(value);
    updateNodeData({ gaugeComPort: value });
  };

  // Enhanced frac baud rate change handler
  const handleFracBaudRateChange = (value: string) => {
    console.log('Enhanced frac baud rate change:', { from: fracBaudRate, to: value });
    setFracBaudRate(value);
    updateNodeData({ fracBaudRate: value });
  };

  // Enhanced gauge baud rate change handler
  const handleGaugeBaudRateChange = (value: string) => {
    console.log('Enhanced gauge baud rate change:', { from: gaugeBaudRate, to: value });
    setGaugeBaudRate(value);
    updateNodeData({ gaugeBaudRate: value });
  };

  // Enhanced sync with node data when data changes
  useEffect(() => {
    console.log('Enhanced MainBoxNode data sync effect:', {
      nodeId: id,
      dataFracComPort: data.fracComPort,
      dataGaugeComPort: data.gaugeComPort,
      dataFracBaudRate: data.fracBaudRate,
      dataGaugeBaudRate: data.gaugeBaudRate,
      currentState: { fracDataPort, gaugeDataPort, fracBaudRate, gaugeBaudRate }
    });

    if (data.fracComPort !== undefined && data.fracComPort !== fracDataPort) {
      console.log('Syncing frac COM port from data:', data.fracComPort);
      setFracDataPort(data.fracComPort);
    }
    if (data.gaugeComPort !== undefined && data.gaugeComPort !== gaugeDataPort) {
      console.log('Syncing gauge COM port from data:', data.gaugeComPort);
      setGaugeDataPort(data.gaugeComPort);
    }
    if (data.fracBaudRate !== undefined && data.fracBaudRate !== fracBaudRate) {
      console.log('Syncing frac baud rate from data:', data.fracBaudRate);
      setFracBaudRate(data.fracBaudRate);
    }
    if (data.gaugeBaudRate !== undefined && data.gaugeBaudRate !== gaugeBaudRate) {
      console.log('Syncing gauge baud rate from data:', data.gaugeBaudRate);
      setGaugeBaudRate(data.gaugeBaudRate);
    }
  }, [data.fracComPort, data.gaugeComPort, data.fracBaudRate, data.gaugeBaudRate, fracDataPort, gaugeDataPort, fracBaudRate, gaugeBaudRate, id]);

  // Available COM ports for selection
  const comPorts = [
    { id: 'com1', label: 'COM1' },
    { id: 'com2', label: 'COM2' },
    { id: 'com3', label: 'COM3' },
    { id: 'com4', label: 'COM4' },
    { id: 'com5', label: 'COM5' },
    { id: 'com6', label: 'COM6' },
    { id: 'com7', label: 'COM7' },
    { id: 'com8', label: 'COM8' },
  ];

  // Frac COM ports include ColdBore option
  const fracComPorts = [
    { id: 'coldbore', label: 'ColdBore' },
    ...comPorts
  ];

  // Common baud rates with 9600 and 19200 first
  const baudRates = [
    { id: '9600', label: '9600' },
    { id: '19200', label: '19200' },
    { id: '38400', label: '38400' },
    { id: '57600', label: '57600' },
    { id: '115200', label: '115200' },
  ];

  // These pressure ports all come from the selected gauge COM port
  const pressurePorts = [
    { id: 'p1', label: 'P1', pressure: 'Pressure1,2' },
    { id: 'p2', label: 'P2', pressure: 'Pressure3,4' },
    { id: 'p3', label: 'P3', pressure: 'Pressure5,6' },
    { id: 'p4', label: 'P4', pressure: 'Pressure7,8' },
  ];

  const isAssigned = data.assigned && data.equipmentId;

  console.log('Enhanced MainBoxNode render:', {
    id,
    fracDataPort,
    gaugeDataPort,
    fracBaudRate,
    gaugeBaudRate,
    dataValues: {
      fracComPort: data.fracComPort,
      gaugeComPort: data.gaugeComPort,
      fracBaudRate: data.fracBaudRate,
      gaugeBaudRate: data.gaugeBaudRate
    }
  });

  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div className="bg-slate-900 text-white rounded-lg p-4 border-2 border-slate-600 min-w-[280px] shadow-lg relative">
      {selected && <NodeDeleteButton onDelete={handleDelete} />}
      {isAssigned && data.equipmentId && (
        <SimpleRedTagMenu 
          equipmentId={data.equipmentId} 
          nodeId={id}
        />
      )}
      <div className="flex items-center gap-2 mb-4">
        <Square className="h-5 w-5 text-blue-400" />
        <div>
          <h3 className="font-bold text-lg text-white">ShearStream Box</h3>
          {isAssigned && data.equipmentId && (
            <p className="text-sm text-green-400 font-medium">{data.equipmentId}</p>
          )}
        </div>
      </div>
      
      {/* COM Port Selection with Baud Rates - Enhanced with debugging */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200 w-12">Frac:</span>
          <Select value={fracDataPort} onValueChange={handleFracDataPortChange}>
            <SelectTrigger className="h-8 text-sm bg-slate-700 border-slate-500 text-white hover:bg-slate-600 flex-1">
              <SelectValue placeholder="COM" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {fracComPorts.map(port => (
                <SelectItem key={port.id} value={port.id} className="text-white hover:bg-slate-700">
                  {port.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fracDataPort !== 'coldbore' && (
            <Select value={fracBaudRate} onValueChange={handleFracBaudRateChange}>
              <SelectTrigger className="h-8 text-sm bg-slate-700 border-slate-500 text-white hover:bg-slate-600 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {baudRates.map(rate => (
                  <SelectItem key={rate.id} value={rate.id} className="text-white hover:bg-slate-700">
                    {rate.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {fracDataPort === 'coldbore' && (
            <span className="text-xs text-slate-400 italic">API Connection</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200 w-12">Gauge:</span>
          <Select value={gaugeDataPort} onValueChange={handleGaugeDataPortChange}>
            <SelectTrigger className="h-8 text-sm bg-slate-700 border-slate-500 text-white hover:bg-slate-600 flex-1">
              <SelectValue placeholder="COM" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {comPorts.map(port => (
                <SelectItem key={port.id} value={port.id} className="text-white hover:bg-slate-700">
                  {port.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={gaugeBaudRate} onValueChange={handleGaugeBaudRateChange}>
            <SelectTrigger className="h-8 text-sm bg-slate-700 border-slate-500 text-white hover:bg-slate-600 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {baudRates.map(rate => (
                <SelectItem key={rate.id} value={rate.id} className="text-white hover:bg-slate-700">
                  {rate.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        {pressurePorts.map((port, index) => (
          <div key={port.id} className="flex items-center justify-between bg-slate-700 rounded-md p-3 relative border border-slate-600">
            <div>
              <span className="font-semibold text-white text-base">{port.label}</span>
              <span className="text-sm text-slate-300 ml-2">({port.pressure})</span>
            </div>
            <Handle
              type="source"
              position={Position.Right}
              id={port.id}
              style={{
                right: -8,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: '#3b82f6',
                border: '2px solid white',
                width: 12,
                height: 12,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MainBoxNode;
