import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../types';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, CalendarIcon, Check, Clock, AlignLeft } from '../components/Icons';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, parseISO, isToday as dfIsToday } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CalendarViewProps {
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateEvent: (event: CalendarEvent, previous: CalendarEvent) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, onAddEvent, onDeleteEvent, onUpdateEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CalendarEvent['type']>('personal');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Double click to add
  const handleDayDoubleClick = (day: Date) => {
    setSelectedDate(day);
    openAddModal(day);
  };

  const openAddModal = (initialDate?: Date) => {
    setIsEditing(false);
    setEditId(null);
    setEditingEvent(null);
    setTitle('');
    setDate(initialDate ? format(initialDate, 'yyyy-MM-dd') : (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')));
    setStartTime('');
    setEndTime('');
    setDescription('');
    setType('personal');
    setShowModal(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setIsEditing(true);
    setEditId(event.id);
    setEditingEvent(event);
    setTitle(event.title);
    setDate(event.date);
    setStartTime(event.startTime || '');
    setEndTime(event.endTime || '');
    setDescription(event.description || '');
    setType(event.type);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!title.trim() || !date) return;

    const eventData: CalendarEvent = {
      id: isEditing && editId ? editId : crypto.randomUUID(),
      title,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      description: description || undefined,
      type,
    };

    if (isEditing && editingEvent) {
      onUpdateEvent(eventData, editingEvent);
    } else {
      onAddEvent(eventData);
    }

    setShowModal(false);
  };

  const selectedDateEvents = events
    .filter(e => isSameDay(parseISO(e.date), selectedDate || new Date()))
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));


  // Monochrome tag styles
  const getTypeStyles = (t: CalendarEvent['type']) => {
    switch (t) {
      case 'work': return 'bg-[#f0f0ef] text-[#37352f]';
      case 'important': return 'bg-[#37352f] text-white';
      case 'personal':
      default: return 'bg-[#f7f7f5] text-[#787774]';
    }
  };

  return (
    <div className="flex h-full bg-white text-[#37352f] overflow-hidden rounded-xl shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_2px_4px_rgba(15,15,15,0.05)] font-sans">

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col h-full border-r border-[#e9e9e8]">
        {/* Helper Header */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-[#e9e9e8] bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight tabular-nums">
              {format(currentDate, 'yyyy년 M월', { locale: ko })}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-[#efefef] rounded transition-colors text-[#9b9a97]">
                <ChevronLeft size={18} />
              </button>
              <button onClick={handleNextMonth} className="p-1 hover:bg-[#efefef] rounded transition-colors text-[#9b9a97]">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              const today = new Date();
              setCurrentDate(today);
              setSelectedDate(today);
            }}
            className="text-sm px-2 py-1 rounded hover:bg-[#efefef] text-[#37352f] transition-colors font-medium"
          >
            오늘
          </button>
        </div>

        {/* Grid Header */}
        <div className="grid grid-cols-7 border-b border-[#e9e9e8]">
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div key={day} className={`py-2 px-3 text-xs font-medium bg-white ${day === '일' ? 'text-[#eb5757]' : 'text-[#acaba9]'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6 h-full">
          {calendarDays.slice(0, 42).map((day, idx) => {
            const dayEvents = events.filter(e => isSameDay(parseISO(e.date), day));
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = dfIsToday(day);

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(day)}
                onDoubleClick={() => handleDayDoubleClick(day)}
                className={`
                   relative border-b border-r border-[#e9e9e8] p-1 select-none transition-colors
                   ${!isCurrentMonth ? 'bg-[#fbfbfa]/50 text-[#d3d1cb]' : 'bg-white hover:bg-[#f7f7f5]'}
                   ${isSelected ? 'bg-[#efefef]!' : ''}
                `}
              >
                {/* Date Number */}
                <div className="flex justify-between items-center px-1 mb-1">
                  <span className={`
                    text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-[#eb5757] text-white' : ''}
                  `}>
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Event Bars */}
                <div className="flex flex-col gap-0.5">
                  {dayEvents.slice(0, 4).map(ev => (
                    <div key={ev.id} className={`
                      text-[11px] px-1.5 py-0.5 rounded-[3px] truncate cursor-pointer font-medium
                      ${getTypeStyles(ev.type)}
                      opacity-90 hover:opacity-100
                    `}>
                      {ev.startTime && <span className="mr-1 opacity-70 font-normal">{ev.startTime}</span>}
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 4 && (
                    <div className="text-[10px] text-[#9b9a97] px-1.5 font-medium">
                      +{dayEvents.length - 4} 더보기
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Detail Panel (Notion-like) */}
      <div className="w-[340px] flex flex-col bg-[#fbfbfa] border-l border-[#e9e9e8] hidden lg:flex">
        <div className="h-14 flex items-center justify-between px-5 border-b border-[#e9e9e8]">
          <span className="text-sm font-semibold text-[#37352f] flex items-center gap-2">
            <Clock size={16} className="text-[#9b9a97]" />
            일정 상세
          </span>
          <button
            onClick={() => openAddModal()}
            className="text-[#9b9a97] hover:text-[#37352f] p-1 rounded hover:bg-[#efefef] transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-6 pb-4 border-b border-[#e9e9e8]">
            <h2 className="text-2xl font-bold text-[#37352f] mb-1">
              {selectedDate ? format(selectedDate, 'M월 d일', { locale: ko }) : '날짜 선택'}
            </h2>
            <p className="text-[#9b9a97] text-sm">
              {selectedDate ? format(selectedDate, 'EEEE', { locale: ko }) : ''}
            </p>
          </div>

          <div className="space-y-4">
            {selectedDateEvents.length === 0 ? (
              <div className="py-10 text-center text-[#acaba9] text-sm">
                <p>등록된 일정이 없습니다.</p>
                <p className="mt-2 text-xs">상단 + 버튼을 눌러 추가하세요</p>
              </div>
            ) : (
              selectedDateEvents.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => openEditModal(ev)}
                  className="group relative bg-white border border-[#e9e9e8] rounded-lg p-3 shadow-sm hover:shadow-md hover:border-[#d3d1cb] transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${ev.type === 'important' ? 'bg-[#37352f]' : 'bg-[#d3d1cb]'
                      }`} />
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-semibold text-[#37352f] mb-1`}>
                        {ev.title}
                      </h4>
                      <div className="text-xs text-[#787774] flex items-center gap-2 mb-2">
                        <span className="bg-[#f7f7f5] px-1.5 py-0.5 rounded text-[#37352f] border border-[#e9e9e8]">
                          {ev.type === 'work' ? '업무' : ev.type === 'important' ? '중요' : '개인'}
                        </span>
                        {(ev.startTime || ev.endTime) && (
                          <span className="font-mono">{ev.startTime || '??:??'} - {ev.endTime || '??:??'}</span>
                        )}
                      </div>
                      {ev.description && (
                        <div className="text-xs text-[#37352f] leading-relaxed bg-[#f7f7f5] p-2 rounded flex gap-2">
                          <AlignLeft size={12} className="mt-0.5 text-[#9b9a97] flex-shrink-0" />
                          <p className="line-clamp-3 break-words">{ev.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteEvent(ev.id); }}
                    className="absolute top-2 right-2 text-[#d3d1cb] hover:text-[#eb5757] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {/* Modern Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="bg-white w-full max-w-[500px] rounded-xl shadow-2xl overflow-hidden text-[#37352f] animate-[scaleIn_0.15s_ease-out]">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-[#e9e9e8] flex items-center justify-between bg-[#fbfbfa]">
              <span className="text-sm font-medium text-[#787774]">
                {isEditing ? '일정 편집' : '새로운 일정'}
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#9b9a97] hover:text-[#37352f] hover:bg-[#efefef] p-1 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Title Input */}
              <div>
                <input
                  type="text"
                  placeholder="일정 제목"
                  className="w-full text-xl font-bold placeholder-[#d3d1cb] border-none focus:ring-0 p-0 text-[#37352f] bg-transparent"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Properties Grid */}
              <div className="space-y-3 text-sm">

                {/* Date */}
                <div className="flex items-center h-8">
                  <div className="w-24 text-[#787774] flex items-center gap-2">
                    <CalendarIcon size={14} /> 날짜
                  </div>
                  <input
                    type="date"
                    className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-[#37352f] cursor-pointer hover:bg-[#efefef] rounded px-2 -ml-2"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                {/* Time */}
                <div className="flex items-center h-8">
                  <div className="w-24 text-[#787774] flex items-center gap-2">
                    <Clock size={14} /> 시간
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      className="bg-transparent border-none focus:ring-0 p-0 text-[#37352f] cursor-pointer hover:bg-[#efefef] rounded px-2 -ml-2"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                    <span className="text-[#d3d1cb]">→</span>
                    <input
                      type="time"
                      className="bg-transparent border-none focus:ring-0 p-0 text-[#37352f] cursor-pointer hover:bg-[#efefef] rounded px-2"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Type/Tag */}
                <div className="flex items-center h-8">
                  <div className="w-24 text-[#787774] flex items-center gap-2">
                    <Check size={14} /> 태그
                  </div>
                  <div className="flex gap-1.5">
                    {(['personal', 'work', 'important'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`
                           px-2 py-0.5 rounded text-xs transition-colors border
                           ${type === t
                            ? (t === 'important' ? 'bg-[#37352f] text-white border-[#37352f]' : 'bg-[#f0f0ef] text-[#37352f] border-[#d3d1cb]')
                            : 'bg-white text-[#787774] border-[#e9e9e8] hover:bg-[#efefef]'}
                        `}
                      >
                        {t === 'work' ? '업무' : t === 'important' ? '중요' : '개인'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="flex items-start mt-2">
                  <div className="w-24 text-[#787774] flex items-center gap-2 pt-1">
                    <AlignLeft size={14} /> 메모
                  </div>
                  <textarea
                    placeholder="내용을 입력하세요..."
                    rows={4}
                    className="flex-1 bg-[#fbfbfa] border border-[#e9e9e8] rounded p-2 text-sm focus:ring-1 focus:ring-[#d3d1cb] focus:border-[#d3d1cb] resize-none outline-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#fbfbfa] border-t border-[#e9e9e8] flex justify-end">
              <button
                onClick={handleSave}
                className="bg-[#2383e2] hover:bg-[#1d6fce] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors shadow-sm"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
