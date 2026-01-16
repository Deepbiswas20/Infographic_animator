import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

export default function ProfessionalVideoChart() {
  const [chartData, setChartData] = useState(null);
  const [chartInstance, setChartInstance] = useState(null);
  const [currentChartType, setCurrentChartType] = useState('bar');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  
  // Video settings
  const [videoSettings, setVideoSettings] = useState({
    duration: 3,
    fps: 60,
    quality: 'high',
    format: 'webm',
    resolution: '1920x1080',
    animationStyle: 'easeInOutQuart',
    theme: 'corporate',
    includeTitle: true,
    backgroundColor: '#ffffff',
    titleText: 'Professional Chart Animation',
    subtitleText: 'Data Visualization Report'
  });

  // Video recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingPhase, setRecordingPhase] = useState('');
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Chart types
  const chartTypes = [
    { type: 'bar', icon: 'fas fa-chart-bar', name: 'Bar Chart' },
    { type: 'line', icon: 'fas fa-chart-line', name: 'Line Chart' },
    { type: 'pie', icon: 'fas fa-chart-pie', name: 'Pie Chart' },
    { type: 'doughnut', icon: 'fas fa-dot-circle', name: 'Doughnut' },
    { type: 'radar', icon: 'fas fa-chart-area', name: 'Radar Chart' },
    { type: 'polarArea', icon: 'fas fa-circle', name: 'Polar Area' }
  ];

  // Professional color schemes
  const colorSchemes = {
    corporate: ['#2563eb', '#7c3aed', '#dc2626', '#ea580c', '#ca8a04', '#16a34a'],
    modern: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'],
    elegant: ['#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'],
    vibrant: ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6']
  };

  const showStatus = useCallback((message, type) => {
    setStatusMessage({ message, type });
    if (type === 'success' || type === 'warning') {
      setTimeout(() => setStatusMessage(null), 5000);
    }
  }, []);

  // Generate professional colors
  const generateColors = useCallback((count, scheme = 'corporate') => {
    const colors = colorSchemes[scheme] || colorSchemes.corporate;
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }, []);

  // Parse CSV data
  const parseCSV = useCallback((csv) => {
    const lines = csv.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }
    
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length && i <= 20; i++) { // Limit to 20 rows
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
    
    return data;
  }, []);

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  // Process data for chart
  const processDataForChart = useCallback((data) => {
    if (!data || data.length === 0) {
      throw new Error('No data to process');
    }

    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    
    if (columns.length < 2) {
      throw new Error('Data must have at least 2 columns');
    }

    const labelColumn = columns[0];
    let valueColumn = columns[1];

    // Try to find a numeric column
    for (const col of columns.slice(1)) {
      const testValue = firstRow[col];
      if (!isNaN(parseFloat(testValue)) && isFinite(testValue)) {
        valueColumn = col;
        break;
      }
    }

    const labels = [];
    const values = [];

    data.forEach((row, index) => {
      const label = row[labelColumn] || `Item ${index + 1}`;
      let value = parseFloat(row[valueColumn]);

      if (isNaN(value)) {
        const numMatch = String(row[valueColumn]).match(/[\d.,-]+/);
        if (numMatch) {
          const numStr = numMatch[0].replace(/,/g, '');
          value = parseFloat(numStr) || 1;
        } else {
          value = 1;
        }
      }

      labels.push(String(label).trim());
      values.push(value);
    });

    const colors = generateColors(labels.length, videoSettings.theme);

    return {
      labels: labels,
      datasets: [{
        label: valueColumn || 'Values',
        data: values,
        backgroundColor: colors.map(c => c + '80'), // Semi-transparent
        borderColor: colors,
        borderWidth: 3,
        pointBackgroundColor: colors,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        tension: 0.4
      }]
    };
  }, [generateColors, videoSettings.theme]);

  // Handle file upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    showStatus(`Processing file: ${file.name}`, 'warning');
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        let data;
        if (file.name.toLowerCase().endsWith('.csv')) {
          data = parseCSV(e.target.result);
        } else if (file.name.toLowerCase().endsWith('.json')) {
          data = JSON.parse(e.target.result);
          if (!Array.isArray(data)) {
            const keys = Object.keys(data);
            if (keys.length > 0 && Array.isArray(data[keys[0]])) {
              data = data[keys[0]];
            } else {
              data = [data];
            }
          }
        } else {
          throw new Error('Unsupported file type');
        }
        
        const processedData = processDataForChart(data);
        setChartData(processedData);
        showStatus(`File loaded successfully! ${data.length} records processed.`, 'success');
        
      } catch (error) {
        console.error('Error processing file:', error);
        showStatus(`Error processing file: ${error.message}`, 'error');
      }
      setIsLoading(false);
    };
    
    if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.json')) {
      reader.readAsText(file);
    } else {
      showStatus('Unsupported file type. Please use CSV or JSON files.', 'error');
      setIsLoading(false);
    }
  }, [parseCSV, processDataForChart, showStatus]);

  // Generate sample data
  const generateSampleData = useCallback(() => {
    const sampleData = [
      { Quarter: 'Q1 2024', Revenue: 125000 },
      { Quarter: 'Q2 2024', Revenue: 145000 },
      { Quarter: 'Q3 2024', Revenue: 165000 },
      { Quarter: 'Q4 2024', Revenue: 185000 },
      { Quarter: 'Q1 2025', Revenue: 210000 }
    ];

    const processedData = processDataForChart(sampleData);
    setChartData(processedData);
    showStatus('Sample data loaded! Ready for professional video creation.', 'success');
  }, [processDataForChart, showStatus]);

  // Create chart with professional styling
  const createChart = useCallback(async (data = chartData) => {
    if (!data || !canvasRef.current) return;

    try {
      const { default: Chart } = await import('chart.js/auto');

      if (chartInstance) {
        chartInstance.destroy();
        setChartInstance(null);
      }

      const existingChart = Chart.getChart(canvasRef.current);
      if (existingChart) {
        existingChart.destroy();
      }

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      const config = {
        type: currentChartType,
        data: JSON.parse(JSON.stringify(data)),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 0 },
          layout: { padding: 20 },
          plugins: {
            title: {
              display: videoSettings.includeTitle,
              text: videoSettings.titleText,
              font: { size: 18, weight: 'bold' },
              padding: { top: 10, bottom: 20 },
              color: '#1f2937'
            },
            legend: {
              display: ['pie', 'doughnut', 'polarArea'].includes(currentChartType),
              position: 'right',
              labels: {
                usePointStyle: true,
                padding: 15,
                font: { size: 12, weight: 'bold' },
                color: '#374151'
              }
            },
            tooltip: { enabled: false }
          }
        }
      };

      // Add scales for applicable chart types
      if (['bar', 'line'].includes(currentChartType)) {
        config.options.scales = {
          x: {
            display: true,
            title: { display: true, text: 'Categories', color: '#374151' },
            ticks: { color: '#6b7280' },
            grid: { color: 'rgba(107, 114, 128, 0.1)' }
          },
          y: {
            display: true,
            beginAtZero: true,
            title: { display: true, text: 'Values', color: '#374151' },
            ticks: { 
              color: '#6b7280',
              callback: function(value) {
                return typeof value === 'number' ? value.toLocaleString() : value;
              }
            },
            grid: { color: 'rgba(107, 114, 128, 0.1)' }
          }
        };
      }

      const newInstance = new Chart(ctx, config);
      setChartInstance(newInstance);

    } catch (error) {
      console.error('Error creating chart:', error);
      showStatus('Error creating chart', 'error');
    }
  }, [chartData, chartInstance, currentChartType, videoSettings]);

  // Professional video recording
  const createProfessionalVideo = useCallback(async () => {
    if (!chartInstance || !chartData || isRecording) return;

    setIsRecording(true);
    setRecordingProgress(0);
    setRecordingPhase('Preparing video recording...');

    try {
      const originalData = [...chartData.datasets[0].data];
      const fps = Math.min(videoSettings.fps, 60);
      const duration = videoSettings.duration * 1000;
      
      // Setup canvas stream
      const canvas = chartInstance.canvas;
      const stream = canvas.captureStream(fps);

      // Setup MediaRecorder
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      recordedChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        link.download = `professional-chart-${currentChartType}-${timestamp}.webm`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setIsRecording(false);
        setRecordingProgress(0);
        setRecordingPhase('');
        showStatus('Professional video created successfully!', 'success');

        // Restore original chart
        if (chartInstance && chartData) {
          chartInstance.data.datasets[0].data = [...originalData];
          chartInstance.update('none');
        }
      };

      setRecordingPhase('Recording professional video...');
      mediaRecorderRef.current.start(100);

      // Animate chart
      const totalFrames = Math.ceil((duration / 1000) * fps);
      const frameInterval = 1000 / fps;
      let currentFrame = 0;

      const animateFrame = () => {
        if (currentFrame >= totalFrames) {
          mediaRecorderRef.current?.stop();
          return;
        }

        const progress = currentFrame / (totalFrames - 1);
        // Easing function
        const easedProgress = progress < 0.5 
          ? 8 * progress * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 4) / 2;

        // Update chart data
        const frameData = originalData.map(value => value * easedProgress);
        chartInstance.data.datasets[0].data = frameData;
        chartInstance.update('none');

        setRecordingProgress(Math.round(progress * 100));
        currentFrame++;

        setTimeout(animateFrame, frameInterval);
      };

      // Start animation
      chartInstance.data.datasets[0].data = new Array(originalData.length).fill(0);
      chartInstance.update('none');
      setTimeout(animateFrame, 200);

    } catch (error) {
      console.error('Video creation error:', error);
      showStatus(`Failed to create video: ${error.message}`, 'error');
      setIsRecording(false);
      setRecordingProgress(0);
      setRecordingPhase('');
    }
  }, [chartInstance, chartData, isRecording, videoSettings, currentChartType, showStatus]);

  // Effect to create chart when data changes
  useEffect(() => {
    if (chartData) {
      createChart();
    }
  }, [chartData, currentChartType, videoSettings.theme, videoSettings.includeTitle]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Professional Chart Video Creator
          </h1>
          <p className="text-gray-600">
            Create high-quality, professional animated chart videos for presentations and marketing
          </p>
        </div>

        {/* Status Messages */}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-lg border ${
            statusMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            statusMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}>
            {statusMessage.message}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Data Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <i className="fas fa-upload text-blue-600"></i>
                Data Upload
              </h2>
              
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors mb-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="fas fa-cloud-upload-alt text-4xl text-blue-500 mb-4"></i>
                <p className="text-lg mb-2">Drop files here or click to browse</p>
                <p className="text-sm text-gray-500">CSV or JSON files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <Button 
                onClick={generateSampleData}
                variant="outline"
                className="w-full"
              >
                <i className="fas fa-database mr-2"></i>
                Load Sample Data
              </Button>
            </div>

            {/* Chart Type Selection */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Chart Type</h3>
              <div className="grid grid-cols-2 gap-2">
                {chartTypes.map((type) => (
                  <button
                    key={type.type}
                    onClick={() => setCurrentChartType(type.type)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      currentChartType === type.type
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <i className={`${type.icon} text-lg mb-1`}></i>
                    <div className="text-xs font-medium">{type.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Video Settings */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <i className="fas fa-cog text-purple-600"></i>
                Video Settings
              </h2>

              <div className="space-y-4">
                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Duration: {videoSettings.duration}s
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="0.5"
                    value={videoSettings.duration}
                    onChange={(e) => setVideoSettings(prev => ({
                      ...prev,
                      duration: parseFloat(e.target.value)
                    }))}
                    className="w-full"
                  />
                </div>

                {/* FPS */}
                <div>
                  <label className="block text-sm font-medium mb-2">Frame Rate</label>
                  <select
                    value={videoSettings.fps}
                    onChange={(e) => setVideoSettings(prev => ({
                      ...prev,
                      fps: parseInt(e.target.value)
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="30">30 FPS (Standard)</option>
                    <option value="60">60 FPS (Smooth)</option>
                  </select>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium mb-2">Color Theme</label>
                  <select
                    value={videoSettings.theme}
                    onChange={(e) => setVideoSettings(prev => ({
                      ...prev,
                      theme: e.target.value
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="corporate">Corporate</option>
                    <option value="modern">Modern</option>
                    <option value="elegant">Elegant</option>
                    <option value="vibrant">Vibrant</option>
                  </select>
                </div>

                {/* Animation Style */}
                <div>
                  <label className="block text-sm font-medium mb-2">Animation Style</label>
                  <select
                    value={videoSettings.animationStyle}
                    onChange={(e) => setVideoSettings(prev => ({
                      ...prev,
                      animationStyle: e.target.value
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="easeInOutQuart">Smooth (Professional)</option>
                    <option value="linear">Linear</option>
                    <option value="easeInOutCubic">Cubic</option>
                  </select>
                </div>

                {/* Title Settings */}
                <div>
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="includeTitle"
                      checked={videoSettings.includeTitle}
                      onChange={(e) => setVideoSettings(prev => ({
                        ...prev,
                        includeTitle: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    <label htmlFor="includeTitle" className="text-sm font-medium">
                      Include Title
                    </label>
                  </div>
                  
                  {videoSettings.includeTitle && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Chart Title"
                        value={videoSettings.titleText}
                        onChange={(e) => setVideoSettings(prev => ({
                          ...prev,
                          titleText: e.target.value
                        }))}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Subtitle (optional)"
                        value={videoSettings.subtitleText}
                        onChange={(e) => setVideoSettings(prev => ({
                          ...prev,
                          subtitleText: e.target.value
                        }))}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Create Video Button */}
              <div className="mt-6">
                <Button
                  onClick={createProfessionalVideo}
                  disabled={!chartData || isRecording}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isRecording ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Recording... {recordingProgress}%
                    </>
                  ) : (
                    <>
                      <i className="fas fa-video mr-2"></i>
                      Create Professional Video
                    </>
                  )}
                </Button>
              </div>

              {/* Recording Progress */}
              {isRecording && (
                <div className="mt-4">
                  <div className="text-sm text-gray-600 mb-2">{recordingPhase}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${recordingProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chart Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <i className="fas fa-chart-area text-green-600"></i>
                Chart Preview
              </h2>

              <div className="border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center" style={{ height: '400px' }}>
                {isLoading ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <div className="text-gray-600">Processing data...</div>
                  </div>
                ) : !chartData ? (
                  <div className="text-center text-gray-500">
                    <i className="fas fa-chart-line text-4xl mb-4 text-gray-300"></i>
                    <div>Upload data or load sample to preview chart</div>
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-full"
                    style={{ width: '100%', height: '350px' }}
                  />
                )}
              </div>

              {chartData && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                  {chartData.labels.length} data points • {currentChartType} chart
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}