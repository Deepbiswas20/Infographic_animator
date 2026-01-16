import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Database, Wand2, Download, Copy, RefreshCw, Lightbulb, Sparkles, Eye, Code, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// ER Diagram Types
interface ERAttribute {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

interface EREntity {
  id: string;
  name: string;
  attributes: ERAttribute[];
  x: number;
  y: number;
}

interface ERRelationship {
  id: string;
  fromEntity: string;
  toEntity: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  label?: string;
  x?: number;
  y?: number;
  attributes?: ERAttribute[];
}

// Clean ER Diagram Component with Proper Line Connections
const CleanERDiagram: React.FC<{
  entities: EREntity[];
  relationships: ERRelationship[];
  containerWidth?: number;
  containerHeight?: number;
}> = ({ entities, relationships, containerWidth = 900, containerHeight = 700 }) => {
  const [draggedItem, setDraggedItem] = useState<{id: string, type: 'entity' | 'relationship'} | null>(null);
  const [entityPositions, setEntityPositions] = useState<Record<string, { x: number, y: number }>>({});
  const [relationshipPositions, setRelationshipPositions] = useState<Record<string, { x: number, y: number }>>({});
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate optimal layout with better spacing
  useEffect(() => {
    if (entities.length === 0) return;

    const entityPositions: Record<string, { x: number, y: number }> = {};
    const relationshipPositions: Record<string, { x: number, y: number }> = {};
    
    // Better grid layout with more spacing
    const cols = Math.min(3, Math.ceil(Math.sqrt(entities.length)));
    const entitySpacingX = 400;
    const entitySpacingY = 350;
    const startX = 150;
    const startY = 150;
    
    entities.forEach((entity, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const entityX = startX + col * entitySpacingX;
      const entityY = startY + row * entitySpacingY;
      entityPositions[entity.id] = { x: entityX, y: entityY };
    });

    // Position relationships at midpoints with offset
    relationships.forEach((relationship) => {
      const fromPos = entityPositions[relationship.fromEntity];
      const toPos = entityPositions[relationship.toEntity];
      
      if (fromPos && toPos) {
        const midX = (fromPos.x + toPos.x) / 2 + 120;
        const midY = (fromPos.y + toPos.y) / 2 + 30;
        relationshipPositions[relationship.id] = { x: midX - 50, y: midY - 15 };
      }
    });

    setEntityPositions(entityPositions);
    setRelationshipPositions(relationshipPositions);
    
    // Auto-fit view
    resetViewToFit(entityPositions, relationshipPositions);
  }, [entities, relationships, containerWidth, containerHeight]);

  const resetViewToFit = (entPos?: Record<string, { x: number, y: number }>, relPos?: Record<string, { x: number, y: number }>) => {
    const positions = entPos || entityPositions;
    const relPositions = relPos || relationshipPositions;
    
    if (Object.keys(positions).length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // Calculate bounds including attributes
    Object.values(positions).forEach(pos => {
      minX = Math.min(minX, pos.x - 180);
      maxX = Math.max(maxX, pos.x + 320);
      minY = Math.min(minY, pos.y - 160);
      maxY = Math.max(maxY, pos.y + 200);
    });

    Object.values(relPositions).forEach(pos => {
      minX = Math.min(minX, pos.x - 50);
      maxX = Math.max(maxX, pos.x + 150);
      minY = Math.min(minY, pos.y - 30);
      maxY = Math.max(maxY, pos.y + 60);
    });

    const padding = 50;
    const totalWidth = maxX - minX + padding * 2;
    const totalHeight = maxY - minY + padding * 2;

    const zoomX = containerWidth / totalWidth;
    const zoomY = containerHeight / totalHeight;
    const optimalZoom = Math.min(zoomX, zoomY, 1);

    setZoom(optimalZoom);
    
    const centerX = (containerWidth - totalWidth * optimalZoom) / 2;
    const centerY = (containerHeight - totalHeight * optimalZoom) / 2;
    setPan({ x: centerX, y: centerY });
  };

  // Calculate proper connection points for lines
  const getConnectionPoint = (fromX: number, fromY: number, toX: number, toY: number, isEntity: boolean = true) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { x: fromX, y: fromY };
    
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    if (isEntity) {
      // Entity bounds: 220px wide, 60px tall
      const halfWidth = 110;
      const halfHeight = 30;
      
      // Calculate intersection with rectangle
      const t = Math.min(
        Math.abs(halfWidth / unitX),
        Math.abs(halfHeight / unitY)
      );
      
      return {
        x: fromX + unitX * t,
        y: fromY + unitY * t
      };
    } else {
      // Diamond bounds: 100px wide, 30px tall
      const halfWidth = 50;
      const halfHeight = 15;
      
      const t = Math.min(
        Math.abs(halfWidth / unitX),
        Math.abs(halfHeight / unitY)
      );
      
      return {
        x: fromX + unitX * t,
        y: fromY + unitY * t
      };
    }
  };

  const handleMouseDown = (id: string, type: 'entity' | 'relationship', e: React.MouseEvent) => {
    if (e.button === 0) {
      setDraggedItem({id, type});
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handlePanStart = (e: React.MouseEvent) => {
    if (e.button === 0 && !draggedItem) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedItem && !isPanning) {
      const svg = svgRef.current;
      if (!svg) return;
      
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      
      if (draggedItem.type === 'entity') {
        setEntityPositions(prev => ({
          ...prev,
          [draggedItem.id]: { x: Math.max(0, x - 110), y: Math.max(0, y - 30) }
        }));
      } else if (draggedItem.type === 'relationship') {
        setRelationshipPositions(prev => ({
          ...prev,
          [draggedItem.id]: { x: Math.max(0, x - 50), y: Math.max(0, y - 15) }
        }));
      }
    } else if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDraggedItem(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = newZoom / zoom;
      setPan(prev => ({
        x: mouseX - (mouseX - prev.x) * zoomFactor,
        y: mouseY - (mouseY - prev.y) * zoomFactor
      }));
    }
    
    setZoom(newZoom);
  };

  const resetView = () => {
    resetViewToFit();
  };

  const drawCleanAttributes = (entity: EREntity, pos: { x: number; y: number }) => {
    const entityCenterX = pos.x + 110;
    const entityCenterY = pos.y + 30;
    const attributes = entity.attributes;
    
    if (attributes.length === 0) return null;
    
    return attributes.map((attr, index) => {
      // Better circular arrangement with consistent spacing
      const angleStep = (2 * Math.PI) / attributes.length;
      const angle = index * angleStep - Math.PI / 2;
      const radius = 130;
      
      const attrX = entityCenterX + Math.cos(angle) * radius;
      const attrY = entityCenterY + Math.sin(angle) * radius;
      
      // Responsive oval size
      const textLength = Math.max(attr.name.length, attr.type.length + 2);
      const ovalWidth = Math.max(80, textLength * 7 + 20);
      const ovalHeight = 32;
      
      // Proper connection from entity edge to attribute
      const entityEdge = getConnectionPoint(entityCenterX, entityCenterY, attrX, attrY, true);
      const attrEdge = getConnectionPoint(attrX, attrY, entityCenterX, entityCenterY, false);
      
      return (
        <g key={`${entity.id}-attr-${index}`}>
          {/* Clean connection line */}
          <line
            x1={entityEdge.x}
            y1={entityEdge.y}
            x2={attrEdge.x}
            y2={attrEdge.y}
            stroke="#64748b"
            strokeWidth="1.5"
            opacity="0.7"
          />
          
          {/* Clean attribute oval */}
          <ellipse
            cx={attrX}
            cy={attrY}
            rx={ovalWidth / 2}
            ry={ovalHeight / 2}
            fill={attr.isPrimaryKey ? "#fef3c7" : "#ffffff"}
            stroke={attr.isPrimaryKey ? "#f59e0b" : attr.isForeignKey ? "#ef4444" : "#6b7280"}
            strokeWidth={attr.isPrimaryKey ? "2" : "1.5"}
            strokeDasharray={attr.isForeignKey && !attr.isPrimaryKey ? "4,2" : "0"}
            className="drop-shadow-sm hover:drop-shadow-md transition-all"
          />
          
          {/* Key indicators */}
          {attr.isPrimaryKey && (
            <g>
              <circle
                cx={attrX - ovalWidth / 2 + 10}
                cy={attrY - 8}
                r="6"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="1"
              />
              <text
                x={attrX - ovalWidth / 2 + 10}
                y={attrY - 5}
                fill="#ffffff"
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
                className="select-none pointer-events-none"
              >
                PK
              </text>
            </g>
          )}
          
          {attr.isForeignKey && !attr.isPrimaryKey && (
            <g>
              <rect
                x={attrX - ovalWidth / 2 + 4}
                y={attrY - 12}
                width="14"
                height="10"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="1"
                rx="1"
              />
              <text
                x={attrX - ovalWidth / 2 + 11}
                y={attrY - 5}
                fill="#ffffff"
                fontSize="7"
                fontWeight="bold"
                textAnchor="middle"
                className="select-none pointer-events-none"
              >
                FK
              </text>
            </g>
          )}
          
          {/* Attribute name */}
          <text
            x={attrX}
            y={attrY - 4}
            fill="#1f2937"
            fontSize="11"
            fontWeight={attr.isPrimaryKey ? "bold" : "600"}
            textAnchor="middle"
            dominantBaseline="middle"
            className="select-none pointer-events-none"
          >
            {attr.name}
          </text>
          
          {/* Attribute type */}
          <text
            x={attrX}
            y={attrY + 8}
            fill="#6b7280"
            fontSize="9"
            textAnchor="middle"
            dominantBaseline="middle"
            className="select-none pointer-events-none"
          >
            {attr.type}
          </text>
        </g>
      );
    });
  };

  const drawCleanRelationship = (rel: ERRelationship) => {
    const fromEntity = entities.find(e => e.id === rel.fromEntity);
    const toEntity = entities.find(e => e.id === rel.toEntity);
    
    if (!fromEntity || !toEntity) return null;
    
    const fromPos = entityPositions[rel.fromEntity] || { x: fromEntity.x, y: fromEntity.y };
    const toPos = entityPositions[rel.toEntity] || { x: toEntity.x, y: toEntity.y };
    const relPos = relationshipPositions[rel.id] || { 
      x: (fromPos.x + toPos.x) / 2 + 60,
      y: (fromPos.y + toPos.y) / 2 + 15
    };
    
    const fromCenterX = fromPos.x + 110;
    const fromCenterY = fromPos.y + 30;
    const toCenterX = toPos.x + 110;
    const toCenterY = toPos.y + 30;
    const relCenterX = relPos.x + 50;
    const relCenterY = relPos.y + 15;
    
    // Calculate proper connection points
    const fromToRel = getConnectionPoint(fromCenterX, fromCenterY, relCenterX, relCenterY, true);
    const relToFrom = getConnectionPoint(relCenterX, relCenterY, fromCenterX, fromCenterY, false);
    const toToRel = getConnectionPoint(toCenterX, toCenterY, relCenterX, relCenterY, true);
    const relToTo = getConnectionPoint(relCenterX, relCenterY, toCenterX, toCenterY, false);
    
    let cardinalityFrom = '';
    let cardinalityTo = '';
    
    switch (rel.type) {
      case 'one-to-one':
        cardinalityFrom = '1';
        cardinalityTo = '1';
        break;
      case 'one-to-many':
        cardinalityFrom = '1';
        cardinalityTo = 'M';
        break;
      case 'many-to-many':
        cardinalityFrom = 'M';
        cardinalityTo = 'N';
        break;
    }
    
    return (
      <g key={rel.id}>
        {/* Clean lines from entities to diamond */}
        <line
          x1={fromToRel.x}
          y1={fromToRel.y}
          x2={relToFrom.x}
          y2={relToFrom.y}
          stroke="#4b5563"
          strokeWidth="2"
        />
        
        <line
          x1={relToTo.x}
          y1={relToTo.y}
          x2={toToRel.x}
          y2={toToRel.y}
          stroke="#4b5563"
          strokeWidth="2"
        />
        
        {/* Clean diamond shape */}
        <g
          transform={`translate(${relPos.x}, ${relPos.y})`}
          className="cursor-move"
          onMouseDown={(e) => handleMouseDown(rel.id, 'relationship', e)}
        >
          <polygon
            points="50,0 100,15 50,30 0,15"
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth="2"
            className="drop-shadow-lg hover:fill-blue-50 transition-colors"
          />
          
          <text
            x="50"
            y="18"
            fill="#1e40af"
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            className="pointer-events-none select-none"
          >
            {rel.label || 'relates'}
          </text>
        </g>
        
        {/* Clean cardinality labels */}
        <text
          x={fromToRel.x + (relToFrom.x - fromToRel.x) * 0.25}
          y={fromToRel.y + (relToFrom.y - fromToRel.y) * 0.25 - 8}
          fill="#374151"
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
          className="font-semibold"
        >
          {cardinalityFrom}
        </text>
        
        <text
          x={toToRel.x + (relToTo.x - toToRel.x) * 0.25}
          y={toToRel.y + (relToTo.y - toToRel.y) * 0.25 - 8}
          fill="#374151"
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
          className="font-semibold"
        >
          {cardinalityTo}
        </text>
      </g>
    );
  };

  return (
    <div className="relative">
      {/* Control Panel */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2 bg-white/95 backdrop-blur-sm rounded-lg p-2 border border-gray-200 shadow-lg">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
          className="h-8 px-2"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
          className="h-8 px-2"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={resetView}
          className="h-8 px-2"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <div className="px-2 py-1 text-xs text-gray-600 bg-gray-50 rounded border">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Clean SVG Canvas */}
      <svg
        ref={svgRef}
        width={containerWidth}
        height={containerHeight}
        className="border-2 border-gray-200 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 cursor-grab active:cursor-grabbing shadow-inner"
        onMouseDown={handlePanStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      >        
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Draw attribute ovals first (behind entities) */}
          {entities.map((entity) => {
            const pos = entityPositions[entity.id] || { x: entity.x, y: entity.y };
            return drawCleanAttributes(entity, pos);
          })}
          
          {/* Draw relationships */}
          {relationships.map(drawCleanRelationship)}
          
          {/* Draw entities with clean design */}
          {entities.map((entity) => {
            const pos = entityPositions[entity.id] || { x: entity.x, y: entity.y };
            return (
              <g
                key={entity.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-move"
                onMouseDown={(e) => handleMouseDown(entity.id, 'entity', e)}
              >
                <rect
                  width="220"
                  height="60"
                  fill="#0f766e"
                  stroke="#134e4a"
                  strokeWidth="2"
                  rx="8"
                  className="drop-shadow-lg hover:drop-shadow-xl transition-all"
                />
                
                <text
                  x="110"
                  y="38"
                  fill="white"
                  fontSize="16"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-bold pointer-events-none select-none"
                >
                  {entity.name.toUpperCase()}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Clean Instructions */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 border border-gray-200 text-sm text-gray-700 shadow-lg max-w-xs">
        <div className="space-y-2">
          <div className="font-semibold text-gray-800 mb-2">Controls:</div>
          <div>• Drag entities and diamonds to rearrange</div>
          <div>• Mouse wheel to zoom in/out</div>
          <div>• Drag background to pan around</div>
          <div>• Use controls to reset view</div>
        </div>
      </div>
    </div>
  );
};

// Mermaid ER Diagram Component
const MermaidERDiagram: React.FC<{
  mermaidCode: string;
  width?: number;
  height?: number;
}> = ({ mermaidCode, width = 900, height = 700 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  React.useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).mermaid) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.4.0/mermaid.min.js';
      script.onload = () => {
        (window as any).mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          themeVariables: {
            primaryColor: '#0f766e',
            primaryTextColor: '#1e293b',
            primaryBorderColor: '#14b8a6',
            lineColor: '#64748b',
            sectionBkgColor: '#f1f5f9',
            altSectionBkgColor: '#e2e8f0',
            gridColor: '#cbd5e1',
            secondaryColor: '#ecfccb',
            tertiaryColor: '#fef3c7'
          }
        });
        setIsLoaded(true);
      };
      document.head.appendChild(script);
    } else if ((window as any).mermaid) {
      setIsLoaded(true);
    }
  }, []);

  React.useEffect(() => {
    if (isLoaded && mermaidCode && containerRef.current) {
      const renderDiagram = async () => {
        try {
          containerRef.current!.innerHTML = '';
          const { svg } = await (window as any).mermaid.render(`mermaid-${Date.now()}`, mermaidCode);
          containerRef.current!.innerHTML = svg;
        } catch (error) {
          console.error('Error rendering Mermaid diagram:', error);
          containerRef.current!.innerHTML = '<div class="text-red-500 p-4">Error rendering diagram</div>';
        }
      };
      renderDiagram();
    }
  }, [isLoaded, mermaidCode]);

  return (
    <div
      className="border-2 border-gray-200 rounded-xl bg-white overflow-auto shadow-inner"
      style={{ width, height }}
    >
      <div ref={containerRef} className="flex items-center justify-center min-h-full">
        {!isLoaded && (
          <div className="text-gray-600">Loading diagram...</div>
        )}
      </div>
    </div>
  );
};

export default function EnhancedCleanERDiagram() {
  const [inputText, setInputText] = useState('');
  const [entities, setEntities] = useState<EREntity[]>([]);
  const [relationships, setRelationships] = useState<ERRelationship[]>([]);
  const [mermaidCode, setMermaidCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'mermaid' | 'code'>('visual');

  const examplePrompts = [
    {
      title: "University System",
      description: "Students, courses, instructors with enrollment relationships",
      text: "Create a university ER diagram with:\n- Students table (student_id, name, email, major, enrollment_date)\n- Courses table (course_id, title, credits, department)\n- Instructors table (instructor_id, name, department, hire_date)\n- Enrollments table (enrollment_id, student_id, course_id, grade, semester)\n- Departments table (dept_id, name, budget, head_id)\n\nRelationships:\n- Students enroll in Courses (many-to-many relationship called 'Enrollment')\n- Instructors teach Courses (one-to-many relationship called 'Teaches')\n- Departments have Instructors (one-to-many relationship called 'Employs')\n- Departments offer Courses (one-to-many relationship called 'Offers')"
    },
    {
      title: "Hospital Management",
      description: "Patients, doctors, appointments with treatment relationships",
      text: "Design a hospital database with:\n- Patients table (patient_id, name, phone, address, birth_date)\n- Doctors table (doctor_id, name, specialization, phone, hire_date)\n- Appointments table (appointment_id, patient_id, doctor_id, date, time, status)\n- Treatments table (treatment_id, patient_id, doctor_id, diagnosis, prescription, date)\n- Departments table (dept_id, name, location, head_doctor_id)\n\nRelationships:\n- Patients schedule Appointments with Doctors (many-to-many relationship called 'Schedules')\n- Doctors provide Treatments to Patients (many-to-many relationship called 'Provides')\n- Doctors work in Departments (many-to-one relationship called 'Works_In')"
    },
    {
      title: "E-commerce Platform",
      description: "Customers, products, orders with purchase relationships",
      text: "Create an e-commerce ER diagram with:\n- Customers table (customer_id, name, email, address, registration_date)\n- Products table (product_id, name, description, price, stock_quantity)\n- Orders table (order_id, customer_id, total_amount, order_date, status)\n- Order_Items table (item_id, order_id, product_id, quantity, unit_price)\n- Categories table (category_id, name, description)\n- Reviews table (review_id, customer_id, product_id, rating, comment)\n\nRelationships:\n- Customers place Orders (one-to-many relationship called 'Places')\n- Orders contain Products (many-to-many relationship called 'Contains' via Order_Items)\n- Customers write Reviews for Products (many-to-many relationship called 'Reviews')\n- Products belong to Categories (many-to-one relationship called 'Belongs_To')"
    }
  ];

  const parseTextToER = (text: string): { entities: EREntity[], relationships: ERRelationship[], mermaidCode: string } => {
    const lines = text.toLowerCase().split('\n').filter(line => line.trim());
    const entityMap: { [key: string]: EREntity } = {};
    const relationshipList: ERRelationship[] = [];
    let currentEntityName = '';

    // Parse entities and attributes
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Check for table definitions
      if (trimmedLine.includes('table') && (trimmedLine.includes('(') || trimmedLine.includes(':'))) {
        const tableMatch = trimmedLine.match(/(\w+)\s*table/);
        if (tableMatch) {
          currentEntityName = tableMatch[1].toLowerCase();
          
          entityMap[currentEntityName] = {
            id: currentEntityName,
            name: tableMatch[1].toUpperCase().replace(/_/g, ' '),
            attributes: [],
            x: 0,
            y: 0
          };
          
          // Extract attributes from the same line
          const attributeMatch = trimmedLine.match(/\((.*)\)/);
          if (attributeMatch) {
            const attrs = attributeMatch[1].split(',').map(attr => attr.trim());
            attrs.forEach(attr => {
              if (attr) {
                let attrType = 'string';
                if (attr.includes('id')) attrType = 'int';
                else if (attr.includes('date') || attr.includes('time')) attrType = 'date';
                else if (attr.includes('price') || attr.includes('amount') || attr.includes('budget')) attrType = 'decimal';
                else if (attr.includes('count') || attr.includes('quantity') || attr.includes('stock') || attr.includes('rating')) attrType = 'int';
                
                const isKey = attr.includes('id') && !attr.includes('_id');
                const isForeignKey = attr.includes('_id') && attr !== 'id';
                
                entityMap[currentEntityName].attributes.push({
                  name: attr.replace(/ /g, '_'),
                  type: attrType,
                  isPrimaryKey: isKey,
                  isForeignKey
                });
              }
            });
          }
        }
      }
    });

    // Parse relationships with enhanced detection
    const entityNames = Object.keys(entityMap);
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Look for explicit relationship descriptions
      if (trimmedLine.includes('relationship') && trimmedLine.includes('called')) {
        const relationshipMatch = trimmedLine.match(/(\w+)-to-(\w+)\s+relationship\s+called\s+'([^']+)'/);
        if (relationshipMatch) {
          const [, cardinality1, cardinality2, relationshipName] = relationshipMatch;
          
          // Find entities mentioned in the line
          entityNames.forEach(entity1 => {
            entityNames.forEach(entity2 => {
              if (entity1 !== entity2 && trimmedLine.includes(entity1) && trimmedLine.includes(entity2)) {
                let type: 'one-to-one' | 'one-to-many' | 'many-to-many' = 'one-to-many';
                
                if (cardinality1 === 'many' && cardinality2 === 'many') {
                  type = 'many-to-many';
                } else if (cardinality1 === 'one' && cardinality2 === 'one') {
                  type = 'one-to-one';
                } else {
                  type = 'one-to-many';
                }
                
                const existingRel = relationshipList.find(r => 
                  (r.fromEntity === entity1 && r.toEntity === entity2) ||
                  (r.fromEntity === entity2 && r.toEntity === entity1)
                );
                
                if (!existingRel) {
                  relationshipList.push({
                    id: `${entity1}-${entity2}-${relationshipName}`,
                    fromEntity: entity1,
                    toEntity: entity2,
                    type,
                    label: relationshipName.replace(/_/g, ' '),
                    attributes: []
                  });
                }
              }
            });
          });
        }
      }
      
      // Fallback to original relationship parsing
      else if (trimmedLine.includes('have') || trimmedLine.includes('belong') || trimmedLine.includes('can') || 
          trimmedLine.includes('many-to-many') || trimmedLine.includes('one-to-many') || trimmedLine.includes('place') ||
          trimmedLine.includes('contain') || trimmedLine.includes('write') || trimmedLine.includes('schedule') ||
          trimmedLine.includes('provide') || trimmedLine.includes('work') || trimmedLine.includes('teach') ||
          trimmedLine.includes('enroll') || trimmedLine.includes('offer')) {
        
        entityNames.forEach(entity1 => {
          entityNames.forEach(entity2 => {
            if (entity1 !== entity2 && trimmedLine.includes(entity1) && trimmedLine.includes(entity2)) {
              let type: 'one-to-one' | 'one-to-many' | 'many-to-many' = 'one-to-many';
              let label = '';
              
              if (trimmedLine.includes('many-to-many')) {
                type = 'many-to-many';
                label = 'relates to';
              } else if (trimmedLine.includes('one-to-many') || trimmedLine.includes('have many') || trimmedLine.includes('has many')) {
                type = 'one-to-many';
                label = 'has';
              } else if (trimmedLine.includes('belong') || trimmedLine.includes('belongs to')) {
                type = 'one-to-many';
                label = 'belongs to';
              } else if (trimmedLine.includes('enroll')) {
                type = 'many-to-many';
                label = 'enrolls in';
              } else if (trimmedLine.includes('teach')) {
                type = 'one-to-many';
                label = 'teaches';
              } else if (trimmedLine.includes('place')) {
                type = 'one-to-many';
                label = 'places';
              } else if (trimmedLine.includes('contain')) {
                type = 'many-to-many';
                label = 'contains';
              } else if (trimmedLine.includes('write')) {
                type = 'many-to-many';
                label = 'writes';
              } else if (trimmedLine.includes('schedule')) {
                type = 'many-to-many';
                label = 'schedules';
              } else if (trimmedLine.includes('provide')) {
                type = 'many-to-many';
                label = 'provides';
              } else if (trimmedLine.includes('work')) {
                type = 'many-to-one';
                label = 'works in';
              } else if (trimmedLine.includes('offer')) {
                type = 'one-to-many';
                label = 'offers';
              }
              
              // Avoid duplicate relationships
              const existingRel = relationshipList.find(r => 
                (r.fromEntity === entity1 && r.toEntity === entity2) ||
                (r.fromEntity === entity2 && r.toEntity === entity1)
              );
              
              if (!existingRel) {
                relationshipList.push({
                  id: `${entity1}-${entity2}-${index}`,
                  fromEntity: entity1,
                  toEntity: entity2,
                  type,
                  label: label || 'relates to',
                  attributes: []
                });
              }
            }
          });
        });
      }
    });

    // Infer relationships from foreign key patterns if no explicit relationships found
    if (relationshipList.length === 0) {
      Object.values(entityMap).forEach(entity => {
        entity.attributes.forEach(attr => {
          if (attr.name.includes('_id') && !attr.name.startsWith('id')) {
            const foreignEntity = attr.name.replace('_id', '').trim();
            if (entityMap[foreignEntity]) {
              relationshipList.push({
                id: `${foreignEntity}-${entity.id}-fk`,
                fromEntity: foreignEntity,
                toEntity: entity.id,
                type: 'one-to-many',
                label: 'has',
                attributes: []
              });
            }
          }
        });
      });
    }

    // Generate Enhanced Mermaid ER diagram syntax with relationships
    let mermaidER = 'erDiagram\n';
    
    // Add entities with attributes
    Object.values(entityMap).forEach(entity => {
      const capitalizedEntity = entity.name.toUpperCase().replace(/ /g, '-');
      mermaidER += `    ${capitalizedEntity} {\n`;
      
      entity.attributes.forEach(attr => {
        const keyType = attr.isPrimaryKey ? 'PK' : attr.isForeignKey ? 'FK' : '';
        mermaidER += `        ${attr.type} ${attr.name} ${keyType}\n`;
      });
      
      mermaidER += '    }\n\n';
    });

    // Add relationships with proper cardinality notation
    relationshipList.forEach(rel => {
      const e1Upper = entityMap[rel.fromEntity]?.name.toUpperCase().replace(/ /g, '-');
      const e2Upper = entityMap[rel.toEntity]?.name.toUpperCase().replace(/ /g, '-');
      
      if (e1Upper && e2Upper) {
        let mermaidRelation = '';
        switch (rel.type) {
          case 'one-to-one':
            mermaidRelation = `    ${e1Upper} ||--|| ${e2Upper} : "${rel.label}"\n`;
            break;
          case 'one-to-many':
            mermaidRelation = `    ${e1Upper} ||--o{ ${e2Upper} : "${rel.label}"\n`;
            break;
          case 'many-to-many':
            mermaidRelation = `    ${e1Upper} }o--o{ ${e2Upper} : "${rel.label}"\n`;
            break;
        }
        mermaidER += mermaidRelation;
      }
    });

    return { 
      entities: Object.values(entityMap), 
      relationships: relationshipList, 
      mermaidCode: mermaidER 
    };
  };

  const generateERDiagram = async () => {
    if (!inputText.trim()) {
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = parseTextToER(inputText);
      setEntities(result.entities);
      setRelationships(result.relationships);
      setMermaidCode(result.mermaidCode);
    } catch (error) {
      console.error('Failed to generate ER diagram:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mermaidCode);
  };

  const downloadMermaid = () => {
    const blob = new Blob([mermaidCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'er-diagram.mmd';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSVG = () => {
    const svg = document.querySelector('#er-diagram-container svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'er-diagram.svg';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const loadExample = (example: typeof examplePrompts[0]) => {
    setInputText(example.text);
  };

  const clearAll = () => {
    setInputText('');
    setEntities([]);
    setRelationships([]);
    setMermaidCode('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-slate-300"></div>
              <div className="flex items-center space-x-2">
                <Database className="h-6 w-6 text-teal-600" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  Clean ER Diagram Generator
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={clearAll}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center space-x-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            <span>Clean Design with Perfect Line Connections</span>
          </div>
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Professional ER Diagrams with Clean Layout
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Generate clean, professional Entity-Relationship diagrams with proper line connections, 
            diamond relationships, and precise attribute positioning.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <Card className="border-0 bg-white/60 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-teal-600" />
                  <span>Database Description</span>
                </CardTitle>
                <CardDescription>
                  Describe your database structure with tables and relationships
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Example:&#10;Create a university system with:&#10;- Students table (student_id, name, email, major)&#10;- Courses table (course_id, title, credits, department)&#10;- Instructors table (instructor_id, name, department)&#10;&#10;Relationships:&#10;- Students enroll in Courses (many-to-many relationship called 'Enrollment')&#10;- Instructors teach Courses (one-to-many relationship called 'Teaches')"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[300px] resize-none"
                />
                <Button 
                  onClick={generateERDiagram}
                  disabled={isGenerating || !inputText.trim()}
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating Clean ER Diagram...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate ER Diagram
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Example Prompts */}
            <Card className="border-0 bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <span>Example Templates</span>
                </CardTitle>
                <CardDescription>
                  Click any example to load it into the text area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {examplePrompts.map((example, index) => (
                    <div 
                      key={index}
                      onClick={() => loadExample(example)}
                      className="p-4 bg-white/80 rounded-lg border border-slate-200 cursor-pointer hover:bg-white transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 group-hover:text-teal-600 transition-colors">
                            {example.title}
                          </h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {example.description}
                          </p>
                        </div>
                        <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-teal-600 rotate-180 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Output Section */}
          <div className="space-y-6">
            <Card className="border-0 bg-white/60 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5 text-emerald-600" />
                      <span>Clean ER Diagram</span>
                    </CardTitle>
                    <CardDescription>
                      Professional diagram with perfect line connections
                    </CardDescription>
                  </div>
                  {(entities.length > 0 || mermaidCode) && (
                    <div className="flex space-x-2">
                      {/* View Mode Selector */}
                      <div className="flex bg-slate-100 rounded-lg p-1">
                        <Button
                          variant={viewMode === 'visual' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('visual')}
                          className="h-8 px-3"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Visual
                        </Button>
                        <Button
                          variant={viewMode === 'mermaid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('mermaid')}
                          className="h-8 px-3"
                        >
                          <Database className="h-4 w-4 mr-1" />
                          Mermaid
                        </Button>
                        <Button
                          variant={viewMode === 'code' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('code')}
                          className="h-8 px-3"
                        >
                          <Code className="h-4 w-4 mr-1" />
                          Code
                        </Button>
                      </div>
                      
                      {/* Action Buttons */}
                      <Button variant="outline" size="sm" onClick={copyToClipboard}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={viewMode === 'visual' ? downloadSVG : downloadMermaid}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {entities.length > 0 || mermaidCode ? (
                  <div className="space-y-4">
                    {viewMode === 'visual' && entities.length > 0 && (
                      <div id="er-diagram-container">
                        <CleanERDiagram 
                          entities={entities} 
                          relationships={relationships}
                          containerWidth={900}
                          containerHeight={700}
                        />
                      </div>
                    )}
                    
                    {viewMode === 'mermaid' && mermaidCode && (
                      <MermaidERDiagram 
                        mermaidCode={mermaidCode}
                        width={900}
                        height={700}
                      />
                    )}
                    
                    {viewMode === 'code' && mermaidCode && (
                      <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-96">
                        <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                          {mermaidCode}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gradient-to-r from-slate-200 to-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Database className="h-12 w-12 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-600 mb-2">No ER Diagram Generated</h3>
                    <p className="text-slate-500 mb-4">
                      Enter your database description to see the clean visualization
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Features Card */}
            <Card className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 mb-2">Clean Design Features</h3>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>🎯 <strong>Perfect Line Connections:</strong> Proper edge-to-edge connections</li>
                      <li>💎 <strong>Diamond Relationships:</strong> Traditional ER modeling standards</li>
                      <li>🎨 <strong>Clean Layout:</strong> Optimized spacing and visual hierarchy</li>
                      <li>🖱️ <strong>Interactive Controls:</strong> Drag, zoom, and pan functionality</li>
                      <li>📐 <strong>Precise Positioning:</strong> Mathematically calculated connections</li>
                      <li>✨ <strong>Professional Design:</strong> Clean typography and modern styling</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
