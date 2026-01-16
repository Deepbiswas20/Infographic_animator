import { useState, useCallback } from "react";
import { ArrowLeft, Upload, FileSpreadsheet, Download, Plus, Trash2, BarChart3, PieChart, LineChart, MapPin, Table, TrendingUp, Activity, Target, Zap, Grid, Move, Edit2, Check, Filter, Layers, AreaChart, ScatterChart, Calendar, Gauge } from "lucide-react";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BarChart, Bar, LineChart as RechartsLine, Line, PieChart as RechartsPie, Pie, AreaChart as RechartsArea, Area, ScatterChart as RechartsScatter, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';

export default function AutoDashboard() {
  const [page, setPage] = useState(1);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [slicerFilters, setSlicerFilters] = useState({});

  const widgetTypes = [
    { id: 'kpi-basic', name: 'KPI Card', icon: TrendingUp, color: 'from-blue-500 to-blue-600', description: 'Single value metric (Sum)', defaultSize: { w: 1, h: 1 } },
    { id: 'bar-chart', name: 'Bar Chart', icon: BarChart3, color: 'from-orange-500 to-orange-600', description: 'Bar visualization (Sum)', defaultSize: { w: 2, h: 2 } },
    { id: 'line-chart', name: 'Line Chart', icon: LineChart, color: 'from-teal-500 to-teal-600', description: 'Trend over time (Sum)', defaultSize: { w: 2, h: 2 } },
    { id: 'area-chart', name: 'Area Chart', icon: AreaChart, color: 'from-emerald-500 to-emerald-600', description: 'Filled line chart (Sum)', defaultSize: { w: 2, h: 2 } },
    { id: 'pie-chart', name: 'Pie Chart', icon: PieChart, color: 'from-pink-500 to-pink-600', description: 'Part-to-whole (Sum)', defaultSize: { w: 2, h: 2 } },
    { id: 'scatter-chart', name: 'Scatter Plot', icon: ScatterChart, color: 'from-violet-500 to-violet-600', description: 'Correlation view', defaultSize: { w: 2, h: 2 } },
    { id: 'data-table', name: 'Data Table', icon: Table, color: 'from-indigo-500 to-indigo-600', description: 'Tabular view', defaultSize: { w: 3, h: 2 } },
    { id: 'metric-grid', name: 'Metric Grid', icon: Grid, color: 'from-cyan-500 to-cyan-600', description: 'Multiple metrics (Sum)', defaultSize: { w: 2, h: 1 } },
    { id: 'gauge', name: 'Gauge Chart', icon: Gauge, color: 'from-yellow-500 to-yellow-600', description: 'Progress indicator (Sum)', defaultSize: { w: 1, h: 1 } },
    { id: 'slicer', name: 'Slicer', icon: Filter, color: 'from-slate-500 to-slate-600', description: 'Filter control', defaultSize: { w: 1, h: 1 } },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // --- Data Loading Handlers ---

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setUploadedFile(file);

    const fileExtension = file.name.split('.').pop().toLowerCase();

    const processData = (jsonData) => {
        if (jsonData && jsonData.length > 0) {
            const headers = jsonData[0];
            const safeHeaders = headers.map(h => String(h).trim()).filter(h => h);
            
            // Clean data rows: remove rows where all cells are null/empty, and ensure cells are strings/numbers
            const dataRows = jsonData.slice(1).map(row => 
                row.map(cell => (cell === null || cell === undefined) ? '' : String(cell))
            ).filter(row => row.some(cell => cell !== ''));

            setColumns(safeHeaders);
            setFileData({ headers: safeHeaders, rows: dataRows, totalRows: dataRows.length });
        }
        setProcessing(false);
    };

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        complete: (results) => {
          processData(results.data);
        },
        error: (error) => {
          alert('Error parsing CSV: ' + error.message);
          setProcessing(false);
        }
      });
    } else if (['xlsx', 'xls'].includes(fileExtension)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          processData(jsonData);
        } catch (error) {
          alert('Error parsing Excel: ' + error.message);
          setProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  // --- Widget Management (Unchanged) ---

  const addWidget = (widgetType) => {
    const newWidget = {
      id: Date.now(),
      type: widgetType.id,
      name: widgetType.name,
      icon: widgetType.icon,
      color: widgetType.color,
      title: `New ${widgetType.name}`,
      columns: [],
      xAxis: '',
      yAxis: '',
      valueColumn: '',
      size: widgetType.defaultSize,
      configured: false
    };
    setWidgets([...widgets, newWidget]);
    setSelectedWidget(newWidget.id);
  };

  const updateWidget = (widgetId, updates) => {
    setWidgets(widgets.map(widget => widget.id === widgetId ? { ...widget, ...updates } : widget));
  };

  const removeWidget = (widgetId) => {
    setWidgets(widgets.filter(widget => widget.id !== widgetId));
    if (selectedWidget === widgetId) setSelectedWidget(null);
  };

  const toggleColumn = (widgetId, column) => {
    setWidgets(widgets.map(widget => {
      if (widget.id === widgetId) {
        const cols = widget.columns.includes(column) ? widget.columns.filter(c => c !== column) : [...widget.columns, column];
        return { ...widget, columns: cols };
      }
      return widget;
    }));
  };

  const markWidgetConfigured = (widgetId) => {
    updateWidget(widgetId, { configured: true });
    setSelectedWidget(null);
  };

  const proceedToWorkspace = () => {
    if (widgets.length === 0) {
      alert('Please add at least one widget.');
      return;
    }
    setPage(2);
  };

  const handleDragStart = (widget) => {
    setDraggedWidget(widget);
  };

  const handleDrop = (targetWidget) => {
    if (!draggedWidget || draggedWidget.id === targetWidget.id) return;
    const draggedIndex = widgets.findIndex(w => w.id === draggedWidget.id);
    const targetIndex = widgets.findIndex(w => w.id === targetWidget.id);
    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, removed);
    setWidgets(newWidgets);
    setDraggedWidget(null);
  };

  // --- Data Processing and Filtering ---

  const getFilteredData = () => {
    if (!fileData) return [];
    
    let filtered = fileData.rows.map((row, idx) => {
      const obj = { _rowIndex: idx };
      fileData.headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });

    Object.keys(slicerFilters).forEach(column => {
      const includedValues = slicerFilters[column];
      if (includedValues && includedValues.length > 0) {
        filtered = filtered.filter(row => includedValues.includes(String(row[column])));
      }
    });

    return filtered;
  };

  const processWidgetData = (widget) => {
    const filteredData = getFilteredData();
    
    if (widget.type === 'kpi-basic' || widget.type === 'gauge') {
      const valueCol = widget.valueColumn || widget.yAxis;
      if (!valueCol) return null;
      
      // Robustly get numeric values
      const values = filteredData.map(row => parseFloat(String(row[valueCol]))).filter(v => !isNaN(v));
      if (values.length === 0) return null;
      
      const sum = values.reduce((a, b) => a + b, 0);
      const count = values.length;
      const max = Math.max(...values);
      
      if (widget.type === 'gauge') {
        const effectiveMax = max > 0 ? max : (sum / count || 100); 
        return { value: sum, max: effectiveMax, percent: (sum / effectiveMax) * 100 };
      }
      
      return { value: sum, count: count };
    }

    if (widget.type === 'bar-chart' || widget.type === 'line-chart' || widget.type === 'area-chart' || widget.type === 'pie-chart') {
      if (!widget.xAxis || !widget.yAxis) return [];
      const grouped = {};
      
      filteredData.forEach(row => {
        const key = String(row[widget.xAxis]);
        // Robustly get numeric value for Y-Axis
        const value = parseFloat(String(row[widget.yAxis]));
        
        if (key && !isNaN(value)) {
          // Chart aggregation defaults to SUM
          grouped[key] = (grouped[key] || 0) + value;
        }
      });
      
      // Limit to 10 categories for chart readability
      return Object.keys(grouped).slice(0, 10).map(key => ({
        name: key,
        value: grouped[key]
      })).filter(d => d.value !== 0);
    }

    if (widget.type === 'scatter-chart') {
      if (!widget.xAxis || !widget.yAxis) return [];
      // Use raw data, convert both to numbers, show up to 500 points for better visibility
      return filteredData.slice(0, 500).map(row => ({
        // Robustly get numeric values for both axes
        x: parseFloat(String(row[widget.xAxis])) || 0,
        y: parseFloat(String(row[widget.yAxis])) || 0
      })).filter(d => !isNaN(d.x) && !isNaN(d.y));
    }

    if (widget.type === 'data-table') {
      // Show up to 50 rows in the data table
      return filteredData.slice(0, 50);
    }

    if (widget.type === 'metric-grid') {
      const cols = widget.columns.length > 0 ? widget.columns : [widget.valueColumn].filter(c => c);
      if (cols.length === 0) return [];

      return cols.map(col => {
        // Robust conversion to number for metric calculation
        const values = filteredData.map(row => parseFloat(String(row[col]))).filter(v => !isNaN(v));
        const sum = values.reduce((a, b) => a + b, 0);
        return { name: col, value: sum, count: values.length };
      }).filter(m => m.count > 0);
    }

    return null;
  };

  // --- Widget Rendering Component (Refined) ---

  const renderWidget = (widget) => {
    const data = processWidgetData(widget);
    const Icon = widget.icon;
    
    const RenderPlaceholder = (message) => (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4">
            <Icon className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium text-slate-600 text-center">{message}</p>
            <p className="text-xs text-slate-400 mt-1">Configure columns to see data.</p>
        </div>
    );

    // Slicer
    if (widget.type === 'slicer') {
      const slicerColumn = widget.valueColumn;
      if (!slicerColumn) return RenderPlaceholder("Select a Value Column to filter.");
      
      const allValues = getFilteredData().map(row => String(row[slicerColumn])).filter(v => v);
      const uniqueValues = [...new Set(allValues)].sort().slice(0, 50);
      const filters = slicerFilters[slicerColumn] || []; // Included values

      const handleFilterChange = (value, checked) => {
        setSlicerFilters(prev => {
          const newFilters = { ...prev };
          let currentFilters = newFilters[slicerColumn] || [...new Set(allValues)];
          
          if (checked) {
            currentFilters = [...new Set([...currentFilters, value])];
          } else {
            currentFilters = currentFilters.filter(v => v !== value);
          }

          if (currentFilters.length === [...new Set(allValues)].length || currentFilters.length === 0) {
            delete newFilters[slicerColumn];
          } else {
            newFilters[slicerColumn] = currentFilters;
          }
          return newFilters;
        });
      };

      const isValueIncluded = (value) => {
        const filters = slicerFilters[slicerColumn];
        if (!filters || filters.length === 0) return true;
        return filters.includes(value); 
      };

      return (
        <div className="h-full overflow-y-auto pt-1">
          <div className="space-y-1">
            {uniqueValues.map(value => (
              <label key={value} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isValueIncluded(value)}
                  onChange={(e) => handleFilterChange(value, e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm truncate flex-1">{value}</span>
              </label>
            ))}
            {uniqueValues.length < [...new Set(allValues)].length && (
              <p className="text-xs text-slate-500 p-2 text-center border-t mt-2">...{allValues.length - uniqueValues.length} more values</p>
            )}
          </div>
        </div>
      );
    }

    // KPI
    if (widget.type === 'kpi-basic') {
        const valueCol = widget.valueColumn || widget.yAxis;
        if (!valueCol) return RenderPlaceholder("Select a Value Column for the metric.");
        if (!data || data.count === 0) return RenderPlaceholder(`No numeric data found in **${valueCol}** after filtering.`);
      
      return (
        <div className="h-full flex flex-col items-center justify-center p-4">
          <div className={`w-12 h-12 bg-gradient-to-r ${widget.color} rounded-full flex items-center justify-center mb-3 shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="text-4xl font-extrabold text-slate-800">{data.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-slate-500 mt-2 uppercase tracking-wider">Total Sum of **{valueCol}**</div>
          <div className="text-xs text-slate-400">({data.count} records used)</div>
        </div>
      );
    }

    // Gauge
    if (widget.type === 'gauge') {
        const valueCol = widget.valueColumn || widget.yAxis;
        if (!valueCol) return RenderPlaceholder("Select a Value Column for the gauge.");
        if (!data || data.count === 0) return RenderPlaceholder(`No numeric data found in **${valueCol}** after filtering.`);
        const percentage = Math.min(data.percent, 100);

        return (
            <div className="h-full flex flex-col items-center justify-center p-2">
                <div className="relative w-36 h-36">
                    <svg className="transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                        <circle 
                            cx="60" 
                            cy="60" 
                            r="50" 
                            fill="none" 
                            stroke="#f59e0b" 
                            strokeWidth="10"
                            strokeDasharray={`${(percentage / 100) * 314} 314`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-slate-800">{percentage.toFixed(0)}%</div>
                        </div>
                    </div>
                </div>
                <div className="text-sm text-slate-600 mt-2">Value: {data.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                <div className="text-xs text-slate-500 mt-0.5">Max: {data.max.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
            </div>
        );
    }
    
    // Bar Chart
    if (widget.type === 'bar-chart') {
        if (!widget.xAxis || !widget.yAxis) return RenderPlaceholder("Select X (Category) and Y (Value) axes.");
        if (!data || data.length === 0) return RenderPlaceholder("No valid data generated. Check axis selections or filters.");
        return (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#64748b" height={30} label={{ value: widget.xAxis, position: 'bottom', fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} stroke="#64748b" width={40} label={{ value: `SUM of ${widget.yAxis}`, angle: -90, position: 'left', fontSize: 10 }} />
                    <Tooltip formatter={(value) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        );
    }

    // Line Chart
    if (widget.type === 'line-chart') {
        if (!widget.xAxis || !widget.yAxis) return RenderPlaceholder("Select X (Category) and Y (Value) axes.");
        if (!data || data.length === 0) return RenderPlaceholder("No valid data generated. Check axis selections or filters.");
        return (
            <ResponsiveContainer width="100%" height="100%">
                <RechartsLine data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#64748b" height={30} label={{ value: widget.xAxis, position: 'bottom', fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} stroke="#64748b" width={40} label={{ value: `SUM of ${widget.yAxis}`, angle: -90, position: 'left', fontSize: 10 }} />
                    <Tooltip formatter={(value) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                    <Line type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 3 }} activeDot={{ r: 5 }} />
                </RechartsLine>
            </ResponsiveContainer>
        );
    }

    // Area Chart
    if (widget.type === 'area-chart') {
        if (!widget.xAxis || !widget.yAxis) return RenderPlaceholder("Select X (Category) and Y (Value) axes.");
        if (!data || data.length === 0) return RenderPlaceholder("No valid data generated. Check axis selections or filters.");
        return (
            <ResponsiveContainer width="100%" height="100%">
                <RechartsArea data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#64748b" height={30} label={{ value: widget.xAxis, position: 'bottom', fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} stroke="#64748b" width={40} label={{ value: `SUM of ${widget.yAxis}`, angle: -90, position: 'left', fontSize: 10 }} />
                    <Tooltip formatter={(value) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                    <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                </RechartsArea>
            </ResponsiveContainer>
        );
    }

    // Pie Chart
    if (widget.type === 'pie-chart') {
        if (!widget.xAxis || !widget.yAxis) return RenderPlaceholder("Select X (Category) and Y (Value) axes.");
        if (!data || data.length === 0) return RenderPlaceholder("No valid data generated. Check axis selections or filters.");
        return (
            <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                    <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value" paddingAngle={2}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '10px' }} />
                </RechartsPie>
            </ResponsiveContainer>
        );
    }

    // Scatter Chart
    if (widget.type === 'scatter-chart') {
        if (!widget.xAxis || !widget.yAxis) return RenderPlaceholder("Select X (Numeric) and Y (Numeric) axes.");
        if (!data || data.length < 2) return RenderPlaceholder("Not enough valid numeric data points for scatter plot.");
        return (
            <ResponsiveContainer width="100%" height="100%">
                <RechartsScatter data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" dataKey="x" name={widget.xAxis} tick={{ fontSize: 10 }} stroke="#64748b" height={30} label={{ value: widget.xAxis, position: 'bottom', fontSize: 10 }} />
                    <YAxis type="number" dataKey="y" name={widget.yAxis} tick={{ fontSize: 10 }} stroke="#64748b" width={40} label={{ value: widget.yAxis, angle: -90, position: 'left', fontSize: 10 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                    <Scatter name="Data" data={data} fill="#8b5cf6" />
                </RechartsScatter>
            </ResponsiveContainer>
        );
    }

    // Data Table
    if (widget.type === 'data-table') {
        if (!fileData || fileData.headers.length === 0) return RenderPlaceholder("File data not loaded.");
        if (!data || data.length === 0) return RenderPlaceholder("No rows match the current slicer filters.");
        
        const allColumns = widget.columns.length > 0 ? widget.columns : fileData.headers.slice(0, 5);
        const displayColumns = allColumns.filter(col => fileData.headers.includes(col));

        return (
            <div className="h-full overflow-auto">
                <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-100 sticky top-0 shadow-sm">
                        <tr>
                            {displayColumns.map(col => (
                                <th key={col} className="px-3 py-2 text-left font-bold text-slate-700 border-b border-slate-300">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => (
                            <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                {displayColumns.map(col => (
                                    <td key={col} className="px-3 py-2 text-slate-600 truncate">{String(row[col] || '')}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    // Metric Grid
    if (widget.type === 'metric-grid') {
        if (!data || data.length === 0) return RenderPlaceholder("Select columns to create metric cards.");
        
        const numColumns = widget.size.w * 2;
        return (
            <div className="h-full grid gap-3 p-2" style={{ gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))` }}>
                {data.map((metric, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-xl font-bold text-indigo-600">{metric.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                        <div className="text-xs text-slate-600 mt-1 truncate">{metric.name}</div>
                        <div className="text-xs text-slate-400">SUM</div>
                    </div>
                ))}
            </div>
        );
    }

    // Fallback for unimplemented types
    return (
        <div className="h-full flex items-center justify-center bg-slate-50/50">
            <div className="text-center">
                <Icon className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Visualization not fully supported yet.</p>
            </div>
        </div>
    );
  };

  // --- Export and Reset Functions (Unchanged) ---
  const exportToExcel = () => {
    setProcessing(true);
    const wb = XLSX.utils.book_new();
    const dataWs = XLSX.utils.aoa_to_sheet([fileData.headers, ...fileData.rows]);
    XLSX.utils.book_append_sheet(wb, dataWs, "Source Data");
    const configData = widgets.map((w, idx) => ({
      Index: idx + 1,
      Type: w.type,
      Title: w.title,
      Columns: w.columns.join(', '),
      XAxis: w.xAxis || 'N/A',
      YAxis: w.yAxis || 'N/A',
      ValueColumn: w.valueColumn || 'N/A'
    }));
    const configWs = XLSX.utils.json_to_sheet(configData);
    XLSX.utils.book_append_sheet(wb, configWs, "Dashboard Config");
    XLSX.writeFile(wb, `Dashboard_${uploadedFile.name.split('.')[0]}.xlsx`);
    setTimeout(() => {
      setProcessing(false);
      alert('Dashboard exported to Excel successfully!');
    }, 500);
  };

  const exportToPBIX = () => {
    setProcessing(true);
    const pbixConfig = {
      version: "1.0",
      dataModelSchema: {
        name: uploadedFile.name,
        tables: [{ name: "SourceData", columns: fileData.headers.map(h => ({ name: h, dataType: "string" })) }]
      },
      report: {
        pages: [{
          name: "Dashboard",
          width: 1280,
          height: 720,
          visualContainers: widgets.map((w, idx) => ({
            x: (idx % 3) * 400,
            y: Math.floor(idx / 3) * 300,
            width: w.size.w * 380,
            height: w.size.h * 280,
            config: {
              name: w.title,
              singleVisual: {
                visualType: w.type,
                projections: {
                  Values: w.columns.map(col => ({ queryRef: `SourceData.${col}` })),
                  Category: w.xAxis ? [{ queryRef: `SourceData.${w.xAxis}` }] : [],
                  Y: w.yAxis ? [{ queryRef: `SourceData.${w.yAxis}` }] : []
                }
              }
            }
          }))
        }]
      }
    };
    const blob = new Blob([JSON.stringify(pbixConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Dashboard_${uploadedFile.name.split('.')[0]}.pbix.json`;
    link.click();
    setTimeout(() => {
      setProcessing(false);
      alert('Power BI template exported successfully!');
    }, 500);
  };

  const resetAll = () => {
    setPage(1);
    setUploadedFile(null);
    setFileData(null);
    setColumns([]);
    setWidgets([]);
    setSelectedWidget(null);
    setSlicerFilters({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => window.location.href = "/dashboard"} className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <div className="h-6 w-px bg-slate-300"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Professional Dashboard Builder
              </h1>
            </div>
            {page === 2 && (
              <div className="flex space-x-3">
                <button onClick={() => setPage(1)} className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white hover:bg-slate-50 transition-colors">Back to Config</button>
                <button onClick={resetAll} className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white hover:bg-slate-50 transition-colors">Start Over</button>
              </div>
            )}
          </div>
        </div>
      </header>
    <div className="container mx-auto px-4 py-8 max-w-7xl">
        {page === 1 && (
          <>
            {!fileData ? (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white/90 backdrop-blur-md rounded-2xl p-10 shadow-2xl border border-slate-100">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                      <Upload className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Upload Your Data Source</h2>
                    <p className="text-slate-600">Start building your dashboard by uploading a supported file.</p>
                  </div>
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-indigo-300 rounded-xl p-12 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all shadow-inner">
                      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" disabled={processing} />
                      <div className="text-center">
                        <FileSpreadsheet className="h-16 w-16 text-indigo-500 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-slate-800 mb-2">{processing ? 'Processing File...' : 'Click or Drag File to Upload'}</p>
                        <p className="text-sm text-slate-500">Supports .CSV, .XLSX, and .XLS file formats.</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                  <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-xl sticky top-24 border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2">Widget Library</h3>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                      {widgetTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button key={type.id} onClick={() => addWidget(type)} className="w-full text-left group">
                            <div className="flex items-center space-x-3 p-3 rounded-lg bg-white hover:bg-indigo-50 transition-all border border-slate-200 hover:border-indigo-400 shadow-sm">
                              <div className={`w-8 h-8 bg-gradient-to-r ${type.color} rounded-lg flex items-center justify-center shadow-md`}>
                                <Icon className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm text-slate-800">{type.name}</p>
                                <p className="text-xs text-slate-500">{type.description}</p>
                              </div>
                              <Plus className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-6 pt-4 border-t text-xs text-slate-600 space-y-1">
                      <h4 className="font-bold text-sm text-slate-700 mb-1">Data Summary</h4>
                      <div><strong>File:</strong> <span className="text-indigo-600 font-medium">{uploadedFile?.name}</span></div>
                      <div><strong>Rows:</strong> {fileData?.totalRows?.toLocaleString()}</div>
                      <div><strong>Columns:</strong> {columns.length}</div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3">
                  {widgets.length === 0 ? (
                    <div className="bg-white/90 backdrop-blur-md rounded-xl p-12 shadow-xl text-center border border-slate-100">
                      <Grid className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-slate-700 mb-2">No Widgets Added</h3>
                      <p className="text-slate-600">Select a widget from the library on the left to begin configuration.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between bg-white/90 backdrop-blur-md rounded-lg p-4 shadow-md border border-slate-200">
                        <h3 className="font-semibold text-lg text-slate-700">Configure Widgets ({widgets.length})</h3>
                        <button onClick={proceedToWorkspace} className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-md shadow-lg hover:shadow-xl transition-all">
                          Proceed to Workspace
                        </button>
                      </div>

                      {widgets.map((widget) => {
                        const Icon = widget.icon;
                        const isSelected = selectedWidget === widget.id;
                        
                        return (
                          <div key={widget.id} className={`bg-white/90 rounded-xl shadow-lg overflow-hidden border border-slate-200 transition-all ${isSelected ? 'ring-4 ring-indigo-300 shadow-2xl' : 'hover:shadow-xl'}`}>
                            <div className={`p-3 flex items-center justify-between bg-gradient-to-r ${widget.color}`}>
                              <div className="flex items-center space-x-2">
                                <Icon className="h-5 w-5 text-white" />
                                <span className="font-semibold text-white text-base">{widget.name}</span>
                              </div>
                              <div className="flex space-x-2">
                                {widget.configured && (
                                  <div className="flex items-center space-x-1 bg-white/30 rounded px-2 py-1 text-white">
                                    <Check className="h-3 w-3" />
                                    <span className="text-xs">Saved</span>
                                  </div>
                                )}
                                <button onClick={() => setSelectedWidget(isSelected ? null : widget.id)} className="p-1 hover:bg-white/30 rounded-full transition-colors">
                                  <Edit2 className="h-4 w-4 text-white" />
                                </button>
                                <button onClick={() => removeWidget(widget.id)} className="p-1 hover:bg-white/30 rounded-full transition-colors">
                                  <Trash2 className="h-4 w-4 text-white" />
                                </button>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="p-5 space-y-5">
                                
                                {/* Widget Live Preview */}
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 min-h-[180px] h-60 shadow-inner">
                                    <div className="h-full" style={{ height: 'calc(100% - 10px)' }}>
                                        {renderWidget(widget)}
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                  <label className="block text-xs font-bold text-slate-700 mb-1">Widget Title</label>
                                  <input type="text" value={widget.title} onChange={(e) => updateWidget(widget.id, { title: e.target.value })} className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-shadow" placeholder="Enter widget title" />
                                </div>

                                {/* AXIS CONFIGURATION */}
                                {['bar-chart', 'line-chart', 'area-chart', 'pie-chart', 'scatter-chart'].includes(widget.type) && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-xs font-bold text-slate-700 mb-1">X-Axis (Category/Numeric)</label>
                                      <select value={widget.xAxis} onChange={(e) => updateWidget(widget.id, { xAxis: e.target.value })} className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-shadow">
                                        <option value="">Select X-Axis</option>
                                        {columns.map(col => <option key={col} value={col}>{col}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-700 mb-1">Y-Axis (Value/Numeric)</label>
                                      <select value={widget.yAxis} onChange={(e) => updateWidget(widget.id, { yAxis: e.target.value })} className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-shadow">
                                        <option value="">Select Y-Axis</option>
                                        {columns.map(col => <option key={col} value={col}>{col}</option>)}
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {/* VALUE COLUMN CONFIGURATION (For KPI/Gauge/Slicer/MetricGrid Fallback) */}
                                {['kpi-basic', 'gauge', 'slicer'].includes(widget.type) && (
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Value/Slicer Column</label>
                                    <select value={widget.valueColumn} onChange={(e) => updateWidget(widget.id, { valueColumn: e.target.value })} className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-shadow">
                                      <option value="">Select Column</option>
                                      {columns.map(col => <option key={col} value={col}>{col}</option>)}
                                    </select>
                                  </div>
                                )}

                                {/* ADDITIONAL COLUMNS (For Data Table/Metric Grid) */}
                                <div className="border p-3 rounded-lg bg-slate-50">
                                  <label className="block text-xs font-bold text-slate-700 mb-2">Additional Columns (For Tables/Grids)</label>
                                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto pr-2">
                                    {columns.map((column) => (
                                      <label key={column} className="flex items-center space-x-2 text-xs cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                        <input type="checkbox" checked={widget.columns.includes(column)} onChange={() => toggleColumn(widget.id, column)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                        <span className="truncate text-slate-700">{column}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                <button onClick={() => markWidgetConfigured(widget.id)} className="w-full flex items-center justify-center px-4 py-2 text-base font-medium bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-md shadow-lg hover:from-indigo-700 hover:to-violet-700 transition-all">
                                  <Check className="h-4 w-4 mr-2" />
                                  Finalize & Save Configuration
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {page === 2 && (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-6 border-b pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Interactive Workspace</h2>
                  <p className="text-sm text-slate-600">Drag tiles to rearrange. Slicers filter all data-bound widgets.</p>
                </div>
                <div className="flex space-x-3">
                  <button onClick={exportToExcel} disabled={processing} className="flex items-center px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md shadow-md hover:bg-green-700 disabled:opacity-50 transition-colors">
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel Config
                  </button>
                  <button onClick={exportToPBIX} disabled={processing} className="flex items-center px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    <Download className="h-4 w-4 mr-2" />
                    Export PBIX Template
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {widgets.map((widget) => {
                  const Icon = widget.icon;
                  // Determine grid size classes dynamically
                  const gridColSpan = widget.size.w === 3 ? 'md:col-span-2 lg:col-span-3' : widget.size.w === 2 ? 'md:col-span-2' : '';
                  const gridRowSpan = widget.size.h === 2 ? 'row-span-2' : '';
                  
                  return (
                    <div 
                      key={widget.id} 
                      draggable 
                      onDragStart={() => handleDragStart(widget)} 
                      onDragOver={(e) => e.preventDefault()} 
                      onDrop={() => handleDrop(widget)} 
                      className={`bg-white rounded-xl shadow-xl overflow-hidden cursor-move border border-slate-200 hover:ring-2 hover:ring-indigo-100 transition-all ${gridColSpan} ${gridRowSpan}`}
                      style={{ minHeight: widget.size.h === 2 ? '420px' : '220px' }}
                    >
                      {/* Widget Header */}
                      <div className={`p-3 flex items-center justify-between bg-gradient-to-r ${widget.color}`}>
                        <div className="flex items-center space-x-2">
                          <Icon className="h-5 w-5 text-white" />
                          <span className="font-semibold text-white text-base">{widget.title}</span>
                        </div>
                        <Move className="h-4 w-4 text-white/70" />
                      </div>
                      
                      {/* Widget Body */}
                      <div className="p-4" style={{ height: widget.size.h === 2 ? 'calc(100% - 52px)' : 'calc(100% - 52px)' }}>
                        {renderWidget(widget)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}