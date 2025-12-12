import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Plus, X, Calendar, Clock, Users, BookOpen, Image, ChevronRight, ChevronLeft } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 7);

export default function DonScheduler() {
  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState([]);
  const [newClass, setNewClass] = useState({ name: '', day: 'Monday', startTime: '9', endTime: '10' });
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [scheduleImages, setScheduleImages] = useState([]);
  const [showImages, setShowImages] = useState(false);
  const [rlmImage, setRlmImage] = useState(null);
  const [communitySize, setCommunitySize] = useState('');
  const [connectionDeadline, setConnectionDeadline] = useState('');
  const [completedConnections, setCompletedConnections] = useState('');
  const [generatedSchedule, setGeneratedSchedule] = useState(null);
  const [showImageModal, setShowImageModal] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  // CSV Parsing
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

  const parseTimeString = (timeStr) => {
    if (!timeStr) return null;
    const cleaned = timeStr.toLowerCase().replace(/\s/g, '');
    let hours, minutes = 0;
    
    // Handle formats like "9:30am", "14:00", "2pm", "9:30 AM"
    const ampmMatch = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (ampmMatch) {
      hours = parseInt(ampmMatch[1]);
      minutes = ampmMatch[2] ? parseInt(ampmMatch[2]) : 0;
      const isPM = ampmMatch[3]?.toLowerCase() === 'pm';
      const isAM = ampmMatch[3]?.toLowerCase() === 'am';
      
      if (isPM && hours !== 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
    }
    
    return hours >= 0 && hours <= 23 ? hours : null;
  };

  const parseDayString = (dayStr) => {
    if (!dayStr) return null;
    const day = dayStr.toLowerCase().trim();
    const dayMap = {
      'monday': 'Monday', 'mon': 'Monday', 'm': 'Monday',
      'tuesday': 'Tuesday', 'tue': 'Tuesday', 'tu': 'Tuesday', 't': 'Tuesday',
      'wednesday': 'Wednesday', 'wed': 'Wednesday', 'w': 'Wednesday',
      'thursday': 'Thursday', 'thu': 'Thursday', 'th': 'Thursday', 'r': 'Thursday',
      'friday': 'Friday', 'fri': 'Friday', 'f': 'Friday',
      'saturday': 'Saturday', 'sat': 'Saturday', 's': 'Saturday',
      'sunday': 'Sunday', 'sun': 'Sunday', 'su': 'Sunday', 'u': 'Sunday'
    };
    return dayMap[day] || null;
  };

  const processCSV = useCallback((text) => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];

    const parsedClasses = [];
    let headerIndex = -1;
    let nameCol = -1, dayCol = -1, startCol = -1, endCol = -1;

    // Find header row
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const cols = parseCSVLine(lines[i]).map(c => c.toLowerCase());
      const hasClassIndicator = cols.some(c => 
        c.includes('class') || c.includes('course') || c.includes('subject') || c.includes('name')
      );
      const hasDayIndicator = cols.some(c => c.includes('day'));
      const hasTimeIndicator = cols.some(c => 
        c.includes('time') || c.includes('start') || c.includes('end') || c.includes('from') || c.includes('to')
      );
      
      if (hasClassIndicator || hasDayIndicator || hasTimeIndicator) {
        headerIndex = i;
        cols.forEach((col, idx) => {
          if (col.includes('class') || col.includes('course') || col.includes('subject') || col.includes('name')) nameCol = idx;
          if (col.includes('day')) dayCol = idx;
          if (col.includes('start') || col.includes('from') || col === 'time') startCol = idx;
          if (col.includes('end') || col.includes('to')) endCol = idx;
        });
        break;
      }
    }

    // If no header found, try to auto-detect columns
    if (headerIndex === -1) {
      headerIndex = -1; // Start from first row
      nameCol = 0;
      dayCol = 1;
      startCol = 2;
      endCol = 3;
    }

    // Parse data rows
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 3) continue;

      const name = cols[nameCol] || cols[0];
      const dayStr = cols[dayCol] || cols[1];
      const startStr = cols[startCol] || cols[2];
      const endStr = cols[endCol] || cols[3] || cols[2];

      // Handle multiple days (e.g., "MWF" or "Mon, Wed, Fri")
      const dayPatterns = dayStr.match(/[a-zA-Z]+/g) || [];
      const days = [];
      
      dayPatterns.forEach(pattern => {
        // Check if it's a combined pattern like "MWF"
        if (pattern.length <= 4 && !/^(mon|tue|wed|thu|fri|sat|sun)/i.test(pattern)) {
          pattern.split('').forEach(char => {
            const day = parseDayString(char);
            if (day) days.push(day);
          });
        } else {
          const day = parseDayString(pattern);
          if (day) days.push(day);
        }
      });

      const startHour = parseTimeString(startStr);
      const endHour = parseTimeString(endStr);

      if (name && days.length > 0 && startHour !== null) {
        days.forEach(day => {
          parsedClasses.push({
            id: Date.now() + Math.random(),
            name: name,
            day: day,
            startTime: String(startHour),
            endTime: String(endHour || startHour + 1)
          });
        });
      }
    }

    return parsedClasses;
  }, []);

  const handleFileUpload = useCallback((file) => {
    if (!file) return;

    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = processCSV(e.target.result);
          if (parsed.length > 0) {
            setClasses(prev => [...prev, ...parsed]);
            setImportStatus({ type: 'success', message: `Imported ${parsed.length} class${parsed.length > 1 ? 'es' : ''} successfully!` });
          } else {
            setImportStatus({ type: 'error', message: 'No valid classes found. Check CSV format.' });
          }
        } catch (err) {
          setImportStatus({ type: 'error', message: 'Error parsing CSV file.' });
        }
      };
      reader.readAsText(file);
    } else {
      setImportStatus({ type: 'error', message: 'Please upload a CSV file.' });
    }

    setTimeout(() => setImportStatus(null), 4000);
  }, [processCSV]);

  const handleScheduleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setScheduleImages(prev => [...prev, { data: e.target.result, name: file.name }]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeScheduleImage = (index) => {
    setScheduleImages(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Add a class manually
  const addClass = () => {
    if (newClass.name && parseInt(newClass.startTime) < parseInt(newClass.endTime)) {
      setClasses([...classes, { ...newClass, id: Date.now() }]);
      setNewClass({ name: '', day: 'Monday', startTime: '9', endTime: '10' });
      setIsAddingClass(false);
    }
  };

  const removeClass = (id) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  // Handle RLM image upload
  const handleRLMUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setRlmImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Calculate community connections
  const calculateConnections = () => {
    const size = parseInt(communitySize) || 0;
    const completed = parseInt(completedConnections) || 0;
    const remaining = Math.max(0, size - completed);
    
    if (!connectionDeadline) return { remaining, weeksLeft: 0, perWeek: 0, perDay: 0 };
    
    const today = new Date();
    const deadline = new Date(connectionDeadline);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksLeft = Math.max(0.5, (deadline - today) / msPerWeek);
    const perWeek = Math.ceil(remaining / weeksLeft);
    const perDay = Math.ceil(remaining / (weeksLeft * 7));
    
    return { remaining, weeksLeft: weeksLeft.toFixed(1), perWeek, perDay };
  };

  // Generate the full schedule
  const generateSchedule = () => {
    const schedule = {};
    DAYS.forEach(day => {
      schedule[day] = HOURS.map(hour => ({ hour, blocks: [] }));
    });

    // Add classes
    classes.forEach(cls => {
      const daySchedule = schedule[cls.day];
      if (daySchedule) {
        for (let h = parseInt(cls.startTime); h < parseInt(cls.endTime); h++) {
          const hourBlock = daySchedule.find(d => d.hour === h);
          if (hourBlock) {
            hourBlock.blocks.push({ type: 'class', name: cls.name });
          }
        }
      }
    });

    // Add meals
    const mealTimes = [
      { name: 'Breakfast', start: 8, end: 9 },
      { name: 'Lunch', start: 12, end: 13 },
      { name: 'Dinner', start: 18, end: 19 }
    ];

    DAYS.forEach(day => {
      mealTimes.forEach(meal => {
        for (let h = meal.start; h < meal.end; h++) {
          const hourBlock = schedule[day].find(d => d.hour === h);
          if (hourBlock && hourBlock.blocks.length === 0) {
            hourBlock.blocks.push({ type: 'meal', name: meal.name });
          }
        }
      });
    });

    // Add 2 hours personal time per day
    DAYS.forEach(day => {
      let personalHoursAdded = 0;
      for (let h = 14; h <= 21 && personalHoursAdded < 2; h++) {
        const hourBlock = schedule[day].find(d => d.hour === h);
        if (hourBlock && hourBlock.blocks.length === 0) {
          hourBlock.blocks.push({ type: 'personal', name: 'Personal Time' });
          personalHoursAdded++;
        }
      }
      for (let h = 21; h >= 19 && personalHoursAdded < 2; h--) {
        const hourBlock = schedule[day].find(d => d.hour === h);
        if (hourBlock && hourBlock.blocks.length === 0) {
          hourBlock.blocks.push({ type: 'personal', name: 'Personal Time' });
          personalHoursAdded++;
        }
      }
    });

    // Add 15 hours donning per week
    const donHoursPerDay = { Monday: 2, Tuesday: 2, Wednesday: 2, Thursday: 2, Friday: 2, Saturday: 2.5, Sunday: 2.5 };
    DAYS.forEach(day => {
      let donHoursAdded = 0;
      const targetHours = donHoursPerDay[day];
      for (let h = 19; h <= 22 && donHoursAdded < targetHours; h++) {
        const hourBlock = schedule[day].find(d => d.hour === h);
        if (hourBlock && hourBlock.blocks.length === 0) {
          hourBlock.blocks.push({ type: 'don', name: 'Don Duties' });
          donHoursAdded++;
        }
      }
      for (let h = 15; h <= 17 && donHoursAdded < targetHours; h++) {
        const hourBlock = schedule[day].find(d => d.hour === h);
        if (hourBlock && hourBlock.blocks.length === 0) {
          hourBlock.blocks.push({ type: 'don', name: 'Don Duties' });
          donHoursAdded++;
        }
      }
    });

    // Add 8 hours studying per week
    const studyHoursPerDay = { Monday: 1.5, Tuesday: 1.5, Wednesday: 1, Thursday: 1.5, Friday: 1, Saturday: 1, Sunday: 1.5 };
    DAYS.forEach(day => {
      let studyHoursAdded = 0;
      const targetHours = studyHoursPerDay[day];
      for (let h = 10; h <= 20 && studyHoursAdded < targetHours; h++) {
        const hourBlock = schedule[day].find(d => d.hour === h);
        if (hourBlock && hourBlock.blocks.length === 0) {
          hourBlock.blocks.push({ type: 'study', name: 'Study Time' });
          studyHoursAdded++;
        }
      }
    });

    // Fill remaining with social time
    DAYS.forEach(day => {
      for (let h = 14; h <= 22; h++) {
        const hourBlock = schedule[day].find(d => d.hour === h);
        if (hourBlock && hourBlock.blocks.length === 0) {
          hourBlock.blocks.push({ type: 'social', name: 'Social/Activities' });
        }
      }
    });

    setGeneratedSchedule(schedule);
    setStep(4);
  };

  const connectionStats = calculateConnections();

  const getBlockStyle = (type) => {
    const styles = {
      class: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' },
      meal: { background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' },
      personal: { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' },
      don: { background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: '#1a1a2e' },
      study: { background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: '#1a1a2e' },
      social: { background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: '#1a1a2e' }
    };
    return styles[type] || {};
  };

  const formatHour = (h) => {
    if (h === 12) return '12 PM';
    if (h > 12) return `${h - 12} PM`;
    return `${h} AM`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      fontFamily: "'Nunito', 'Segoe UI', sans-serif",
      color: '#e8e8e8',
      padding: '20px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:wght@700&display=swap');
        * { box-sizing: border-box; }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          padding: 30px;
          margin-bottom: 20px;
        }
        
        .step-indicator {
          display: flex;
          gap: 12px;
          margin-bottom: 30px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .step-dot {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        
        .step-dot.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
          transform: scale(1.1);
        }
        
        .step-dot.completed {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          color: #1a1a2e;
        }
        
        .step-dot.inactive {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          padding: 14px 28px;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 12px 24px;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        
        .btn-success {
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.4);
          color: #22c55e;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        .input-field {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 14px 18px;
          color: white;
          font-size: 16px;
          width: 100%;
          font-family: inherit;
          transition: all 0.3s ease;
        }
        
        .input-field:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
        }
        
        .input-field::placeholder { color: rgba(255, 255, 255, 0.4); }
        
        select.input-field { cursor: pointer; }
        select.input-field option { background: #302b63; color: white; }
        
        .class-tag {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 10px 16px;
          border-radius: 30px;
          margin: 5px;
          font-size: 14px;
          font-weight: 600;
        }
        
        .class-tag button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .upload-zone {
          border: 2px dashed rgba(255, 255, 255, 0.3);
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .upload-zone:hover, .upload-zone.dragging {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.1);
        }
        
        .upload-zone.dragging {
          transform: scale(1.02);
        }
        
        .stat-card {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .stat-number {
          font-size: 42px;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #f093fb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .stat-label {
          font-size: 13px;
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 5px;
        }
        
        .schedule-grid {
          display: grid;
          grid-template-columns: 60px repeat(7, 1fr);
          gap: 2px;
          font-size: 11px;
          overflow-x: auto;
        }
        
        .schedule-header {
          background: rgba(102, 126, 234, 0.3);
          padding: 10px 5px;
          text-align: center;
          font-weight: 700;
          border-radius: 8px;
          font-size: 12px;
        }
        
        .schedule-time {
          background: rgba(255, 255, 255, 0.05);
          padding: 8px 4px;
          text-align: center;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }
        
        .schedule-cell {
          min-height: 40px;
          border-radius: 6px;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-weight: 600;
          font-size: 9px;
          line-height: 1.2;
        }
        
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-top: 25px;
          justify-content: center;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        
        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 6px;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .modal-content img {
          max-width: 90vw;
          max-height: 85vh;
          border-radius: 12px;
        }
        
        .status-message {
          padding: 14px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
        }
        
        .status-success {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }
        
        .status-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
        
        .image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
          margin-top: 12px;
        }
        
        .image-thumb {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .image-thumb img {
          width: 100%;
          height: 100px;
          object-fit: cover;
          cursor: pointer;
        }
        
        .image-thumb .remove-btn {
          position: absolute;
          top: 6px;
          right: 6px;
          background: rgba(239, 68, 68, 0.9);
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .image-thumb .image-name {
          padding: 8px;
          font-size: 11px;
          color: #94a3b8;
          background: rgba(0, 0, 0, 0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        h1 {
          font-family: 'Playfair Display', serif;
          font-size: 48px;
          text-align: center;
          margin-bottom: 10px;
          background: linear-gradient(135deg, #fff 0%, #a8edea 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        h2 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .subtitle {
          text-align: center;
          opacity: 0.7;
          margin-bottom: 40px;
          font-size: 18px;
        }
        
        .section-desc {
          opacity: 0.7;
          margin-bottom: 25px;
          font-size: 15px;
        }
        
        .time-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }
        
        .time-item {
          padding: 15px;
          border-radius: 12px;
          text-align: center;
        }
        
        .time-hours {
          font-size: 24px;
          font-weight: 800;
        }
        
        .time-label {
          font-size: 12px;
          opacity: 0.8;
          margin-top: 5px;
        }
        
        .add-class-form {
          display: flex;
          gap: 12px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .upload-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        
        .upload-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          border-radius: 10px;
          border: none;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        
        .upload-btn.csv {
          background: rgba(20, 184, 166, 0.2);
          color: #14b8a6;
          border: 1px solid rgba(20, 184, 166, 0.3);
        }
        
        .upload-btn.image {
          background: rgba(168, 85, 247, 0.2);
          color: #a855f7;
          border: 1px solid rgba(168, 85, 247, 0.3);
        }
        
        .upload-btn:hover {
          transform: translateY(-1px);
        }
      `}</style>

      <h1>Don Schedule Manager</h1>
      <p className="subtitle">Balance your classes, don duties, and personal time</p>

      <div className="step-indicator">
        {[1, 2, 3, 4].map(s => (
          <div
            key={s}
            className={`step-dot ${step === s ? 'active' : step > s ? 'completed' : 'inactive'}`}
            onClick={() => s <= step && setStep(s)}
          >
            {step > s ? '✓' : s}
          </div>
        ))}
      </div>

      {/* Step 1: Class Schedule */}
      {step === 1 && (
        <div className="glass-card" style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2><BookOpen size={28} /> Add Your Classes</h2>
          <p className="section-desc">Upload a CSV, add screenshots for reference, or enter classes manually</p>
          
          {importStatus && (
            <div className={`status-message ${importStatus.type === 'success' ? 'status-success' : 'status-error'}`}>
              {importStatus.type === 'success' ? '✓' : '!'} {importStatus.message}
            </div>
          )}

          {/* Upload Zone */}
          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{ marginBottom: 25 }}
          >
            <FileSpreadsheet size={48} style={{ opacity: 0.5, marginBottom: 15 }} />
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              Drag & drop your class schedule CSV here
            </div>
            <div style={{ opacity: 0.6, marginBottom: 15 }}>
              or use the buttons below
            </div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>
              CSV format: Class Name, Day, Start Time, End Time
            </div>
          </div>

          {/* Upload Buttons */}
          <div className="upload-buttons">
            <label className="upload-btn csv">
              <Upload size={18} />
              Upload CSV
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e.target.files[0])}
                style={{ display: 'none' }}
              />
            </label>
            <label className="upload-btn image">
              <Image size={18} />
              Upload Screenshots
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleScheduleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
            {!isAddingClass && (
              <button className="btn-secondary" onClick={() => setIsAddingClass(true)}>
                <Plus size={18} /> Add Manually
              </button>
            )}
          </div>

          {/* Screenshot Gallery */}
          {scheduleImages.length > 0 && (
            <div style={{ marginBottom: 25 }}>
              <button
                onClick={() => setShowImages(!showImages)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: 10,
                  color: '#a855f7',
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                {showImages ? '▼' : '▶'} {scheduleImages.length} screenshot{scheduleImages.length > 1 ? 's' : ''} uploaded
              </button>
              {showImages && (
                <div className="image-grid">
                  {scheduleImages.map((img, idx) => (
                    <div key={idx} className="image-thumb">
                      <img
                        src={img.data}
                        alt={img.name}
                        onClick={() => setShowImageModal(img.data)}
                      />
                      <button className="remove-btn" onClick={() => removeScheduleImage(idx)}>
                        <X size={14} />
                      </button>
                      <div className="image-name">{img.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manual Add Form */}
          {isAddingClass && (
            <div className="add-class-form">
              <input
                className="input-field"
                placeholder="Class name (e.g., PSYCH 101)"
                value={newClass.name}
                onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                style={{ flex: 1, minWidth: 150 }}
              />
              <select
                className="input-field"
                value={newClass.day}
                onChange={e => setNewClass({ ...newClass, day: e.target.value })}
                style={{ width: 'auto' }}
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                className="input-field"
                value={newClass.startTime}
                onChange={e => setNewClass({ ...newClass, startTime: e.target.value })}
                style={{ width: 'auto' }}
              >
                {HOURS.slice(0, -1).map(h => (
                  <option key={h} value={h}>{formatHour(h)}</option>
                ))}
              </select>
              <span style={{ color: '#64748b' }}>to</span>
              <select
                className="input-field"
                value={newClass.endTime}
                onChange={e => setNewClass({ ...newClass, endTime: e.target.value })}
                style={{ width: 'auto' }}
              >
                {HOURS.slice(1).map(h => (
                  <option key={h} value={h}>{formatHour(h)}</option>
                ))}
              </select>
              <button className="btn-success" onClick={addClass}>Save</button>
              <button className="btn-secondary" onClick={() => setIsAddingClass(false)}>Cancel</button>
            </div>
          )}

          {/* Class List */}
          {classes.length === 0 && !isAddingClass ? (
            <div style={{ color: '#64748b', fontStyle: 'italic', marginBottom: 25 }}>
              No classes added yet — upload a CSV, add screenshots, or enter manually
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 25 }}>
              {classes.map(cls => (
                <span key={cls.id} className="class-tag">
                  {cls.name} • {cls.day.slice(0, 3)} {formatHour(parseInt(cls.startTime))}-{formatHour(parseInt(cls.endTime))}
                  <button onClick={() => removeClass(cls.id)}>×</button>
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={() => setStep(2)}>
              Continue <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: RLM Calendar */}
      {step === 2 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><Calendar size={28} /> Upload RLM Calendar</h2>
          <p className="section-desc">Upload a photo of your monthly RLM calendar for reference</p>
          
          <input
            type="file"
            accept="image/*"
            onChange={handleRLMUpload}
            style={{ display: 'none' }}
            id="rlm-upload"
          />
          
          {!rlmImage ? (
            <label htmlFor="rlm-upload" className="upload-zone" style={{ display: 'block', marginBottom: 25 }}>
              <Calendar size={48} style={{ opacity: 0.5, marginBottom: 15 }} />
              <div style={{ fontSize: 18, fontWeight: 600 }}>Click to upload your RLM calendar</div>
              <div style={{ opacity: 0.6, marginTop: 10 }}>Supports JPG, PNG, and other image formats</div>
            </label>
          ) : (
            <div style={{ textAlign: 'center', marginBottom: 25 }}>
              <img
                src={rlmImage}
                alt="RLM Calendar"
                style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 12, cursor: 'pointer' }}
                onClick={() => setShowImageModal(rlmImage)}
              />
              <p style={{ opacity: 0.6, marginTop: 10, fontSize: 14 }}>Click image to enlarge</p>
              <label htmlFor="rlm-upload" className="btn-secondary" style={{ display: 'inline-flex', marginTop: 15 }}>
                Replace Image
              </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={() => setStep(1)}><ChevronLeft size={20} /> Back</button>
            <button className="btn-primary" onClick={() => setStep(3)}>Continue <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {/* Step 3: Community Connections */}
      {step === 3 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><Users size={28} /> Community Connections</h2>
          <p className="section-desc">Track your progress and plan your outreach</p>
          
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 30 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Community Size</label>
              <input
                className="input-field"
                type="number"
                placeholder="Number of residents"
                value={communitySize}
                onChange={e => setCommunitySize(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Connections Completed</label>
              <input
                className="input-field"
                type="number"
                placeholder="Already done"
                value={completedConnections}
                onChange={e => setCompletedConnections(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Deadline</label>
              <input
                className="input-field"
                type="date"
                value={connectionDeadline}
                onChange={e => setConnectionDeadline(e.target.value)}
              />
            </div>
          </div>

          {communitySize && connectionDeadline && (
            <div style={{ marginBottom: 30 }}>
              <h3 style={{ marginBottom: 15, fontSize: 20 }}>📊 Your Connection Goals</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 15 }}>
                <div className="stat-card">
                  <div className="stat-number">{connectionStats.remaining}</div>
                  <div className="stat-label">Remaining</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{connectionStats.weeksLeft}</div>
                  <div className="stat-label">Weeks Left</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{connectionStats.perWeek}</div>
                  <div className="stat-label">Per Week</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{connectionStats.perDay}</div>
                  <div className="stat-label">Per Day</div>
                </div>
              </div>
              
              {connectionStats.remaining > 0 && (
                <div style={{ 
                  marginTop: 20, 
                  padding: 20, 
                  background: 'rgba(67, 233, 123, 0.15)',
                  borderRadius: 12,
                  border: '1px solid rgba(67, 233, 123, 0.3)'
                }}>
                  <p style={{ margin: 0, lineHeight: 1.6 }}>
                    💡 <strong>Tip:</strong> To complete {connectionStats.remaining} connections in {connectionStats.weeksLeft} weeks, 
                    aim for about <strong>{connectionStats.perWeek} connections per week</strong> or 
                    roughly <strong>{connectionStats.perDay} per day</strong>. 
                    {connectionStats.perWeek <= 5 && " You're on track for a manageable pace!"}
                    {connectionStats.perWeek > 5 && connectionStats.perWeek <= 10 && " Consider scheduling dedicated connection time during don hours."}
                    {connectionStats.perWeek > 10 && " This is a lot! Consider starting conversations during meals and common area hangouts."}
                  </p>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={() => setStep(2)}><ChevronLeft size={20} /> Back</button>
            <button className="btn-primary" onClick={generateSchedule}>Generate Schedule <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {/* Step 4: Generated Schedule */}
      {step === 4 && generatedSchedule && (
        <div className="glass-card">
          <h2><Clock size={28} /> Your Weekly Schedule</h2>
          <p className="section-desc">Auto-generated with your classes, meals, study time, don duties, and personal time</p>
          
          <div className="time-summary">
            <div className="time-item" style={getBlockStyle('class')}>
              <div className="time-hours">{classes.reduce((acc, c) => acc + (parseInt(c.endTime) - parseInt(c.startTime)), 0)}h</div>
              <div className="time-label">Classes/Week</div>
            </div>
            <div className="time-item" style={getBlockStyle('study')}>
              <div className="time-hours">8h</div>
              <div className="time-label">Study/Week</div>
            </div>
            <div className="time-item" style={getBlockStyle('don')}>
              <div className="time-hours">15h</div>
              <div className="time-label">Don Duties/Week</div>
            </div>
            <div className="time-item" style={getBlockStyle('personal')}>
              <div className="time-hours">14h</div>
              <div className="time-label">Personal/Week</div>
            </div>
            <div className="time-item" style={getBlockStyle('meal')}>
              <div className="time-hours">21h</div>
              <div className="time-label">Meals/Week</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 30 }}>
            <div className="schedule-grid" style={{ minWidth: 700 }}>
              <div className="schedule-header"></div>
              {DAYS.map(day => (
                <div key={day} className="schedule-header">{day.slice(0, 3)}</div>
              ))}
              
              {HOURS.map(hour => (
                <React.Fragment key={hour}>
                  <div className="schedule-time">{formatHour(hour)}</div>
                  {DAYS.map(day => {
                    const hourData = generatedSchedule[day].find(h => h.hour === hour);
                    const block = hourData?.blocks[0];
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="schedule-cell"
                        style={block ? getBlockStyle(block.type) : { background: 'rgba(255,255,255,0.03)' }}
                      >
                        {block?.name || ''}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="legend">
            {[
              { type: 'class', label: 'Classes' },
              { type: 'meal', label: 'Meals' },
              { type: 'study', label: 'Study' },
              { type: 'don', label: 'Don Duties' },
              { type: 'personal', label: 'Personal' },
              { type: 'social', label: 'Social' }
            ].map(item => (
              <div key={item.type} className="legend-item">
                <div className="legend-color" style={getBlockStyle(item.type)}></div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {rlmImage && (
            <div style={{ marginTop: 30 }}>
              <h3 style={{ marginBottom: 15 }}>📅 Your RLM Calendar Reference</h3>
              <img
                src={rlmImage}
                alt="RLM Calendar"
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 12, cursor: 'pointer' }}
                onClick={() => setShowImageModal(rlmImage)}
              />
            </div>
          )}

          {communitySize && (
            <div style={{ 
              marginTop: 30, 
              padding: 25, 
              background: 'rgba(102, 126, 234, 0.15)',
              borderRadius: 16,
              border: '1px solid rgba(102, 126, 234, 0.3)'
            }}>
              <h3 style={{ marginBottom: 10, fontSize: 18 }}>🤝 Community Connection Reminder</h3>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                You have <strong>{connectionStats.remaining} connections</strong> remaining. 
                Aim for <strong>{connectionStats.perWeek}/week</strong> to meet your deadline.
                Use your Don Duties time slots for intentional connections!
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30 }}>
            <button className="btn-secondary" onClick={() => setStep(3)}><ChevronLeft size={20} /> Edit Details</button>
            <button className="btn-secondary" onClick={() => setStep(1)}>Start Over</button>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="modal-overlay" onClick={() => setShowImageModal(null)}>
          <div className="modal-content">
            <img src={showImageModal} alt="Full Size" />
          </div>
        </div>
      )}
    </div>
  );
}
