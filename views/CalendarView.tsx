import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent, CalendarTag } from '../types';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, CalendarIcon, Check, Clock, AlignLeft } from '../components/Icons';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, parseISO, isToday as dfIsToday } from 'date-fns';
import { ko } from 'date-fns/locale/ko';

interface CalendarViewProps {
  events: CalendarEvent[];
  tags: CalendarTag[];
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateEvent: (event: CalendarEvent, previous: CalendarEvent) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, tags, onAddEvent, onDeleteEvent, onUpdateEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const lastWheelTime = useRef<number>(0);

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
  const [isAllDay, setIsAllDay] = useState(false);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CalendarEvent['type']>(tags?.[0]?.id || 'tag_1');

  // Time Picker UI State
  const [showStartHourPicker, setShowStartHourPicker] = useState(false);
  const [showStartMinPicker, setShowStartMinPicker] = useState(false);
  const [showEndHourPicker, setShowEndHourPicker] = useState(false);
  const [showEndMinPicker, setShowEndMinPicker] = useState(false);

  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteOptions = ['00', '10', '20', '30', '40', '50'];

  const getAmPm = (timeStr: string) => {
    if (!timeStr) return '오전';
    const hour = parseInt(timeStr.split(':')[0]);
    return hour >= 12 ? '오후' : '오전';
  };

  const get12hTime = (timeStr: string) => {
    if (!timeStr) return '12:00';
    let [h, m] = timeStr.split(':').map(Number);
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const to24hTime = (time12h: string, ampm: string) => {
    let [h, m] = time12h.split(':').map(Number);
    if (ampm === '오후' && h < 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    // 500ms 간격으로 스로틀링 적용
    if (now - lastWheelTime.current < 500) return;

    if (Math.abs(e.deltaY) < 10) return; // 미세한 움직임 무시

    if (e.deltaY > 0) {
      handleNextMonth();
      lastWheelTime.current = now;
    } else if (e.deltaY < 0) {
      handlePrevMonth();
      lastWheelTime.current = now;
    }
  };

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
    setIsAllDay(false);
    setShowStartHourPicker(false);
    setShowStartMinPicker(false);
    setShowEndHourPicker(false);
    setShowEndMinPicker(false);
    setDescription('');
    setType(tags?.[0]?.id || 'tag_1');
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
    setIsAllDay(event.isAllDay || false);
    setShowStartHourPicker(false);
    setShowStartMinPicker(false);
    setShowEndHourPicker(false);
    setShowEndMinPicker(false);
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
      startTime: !isAllDay ? (startTime || undefined) : undefined,
      endTime: !isAllDay ? (endTime || undefined) : undefined,
      isAllDay,
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

  const handleDelete = () => {
    if (isEditing && editId) {
      onDeleteEvent(editId);
      setShowModal(false);
    }
  };



  // Tag helpers
  const getTag = (tagId: string) => tags?.find(t => t.id === tagId);

  try {
    return (
      <div className="flex h-full bg-white text-[#37352f] overflow-hidden font-sans">

        {/* Main Calendar Area */}
        <div
          className="flex-1 flex flex-col h-full border-r border-[#e9e9e8]"
          onWheel={handleWheel}
        >
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
          </div>

          {/* Grid Header */}
          <div className="grid grid-cols-7 border-b border-[#e9e9e8]">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className={`py-2 px-3 text-sm font-medium bg-white ${day === '일' ? 'text-[#eb5757]' : 'text-[#acaba9]'}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="flex-1 flex flex-col h-full min-h-0 divide-y divide-[#e9e9e8]">
            {(() => {
              const weeks = [];
              for (let i = 0; i < calendarDays.length; i += 7) {
                weeks.push(calendarDays.slice(i, i + 7));
              }

              return weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex-1 grid grid-cols-7 min-h-0 divide-x divide-[#e9e9e8]">
                  {week.map((day) => {
                    const dayEvents = (events || []).filter(e => {
                      try {
                        return e.date && isSameDay(parseISO(e.date), day);
                      } catch (e) {
                        console.error("Error parsing event date:", e);
                        return false;
                      }
                    });
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = dfIsToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => {
                          setSelectedDate(day);
                          openAddModal(day);
                        }}
                        className={`
                        group relative p-1 select-none transition-colors flex flex-col min-h-0
                        ${!isCurrentMonth ? 'bg-[#fbfbfa]/50 text-[#d3d1cb]' : 'bg-white hover:bg-[#f7f7f5]'}
                        ${isSelected ? '!bg-[#efefef]' : ''}
                      `}
                      >
                        {/* Date Number & Add Button */}
                        <div className="flex justify-between items-center px-1 mb-1 min-h-[24px]">
                          <span className={`
                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-[#eb5757] text-white' : ''}
                  `}>
                            {format(day, 'd')}
                          </span>

                          {/* Hover Add Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddModal(day);
                            }}
                            className={`
                      w-5 h-5 flex items-center justify-center rounded hover:bg-[#e0e0e0] text-[#9b9a97] hover:text-[#37352f]
                      opacity-0 group-hover:opacity-100 transition-all
                      ${isSelected ? 'opacity-100' : ''}
                    `}
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Event Bars */}
                        <div className="flex flex-col gap-0.5">
                          {dayEvents.slice(0, 4).map(ev => {
                            const tag = getTag(ev.type);
                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(ev);
                                }}
                                style={{ backgroundColor: tag?.color || '#37352f' }}
                                className={`
                                text-[12.5px] px-2 py-1 rounded-[4px] truncate cursor-pointer font-medium text-white
                                opacity-90 hover:opacity-100 hover:ring-1 hover:ring-inset hover:ring-[#d3d1cb]
                                shadow-sm leading-tight
                              `}
                              >
                                {!ev.isAllDay && ev.startTime && <span className="mr-1.5 opacity-80 font-normal text-[11px]">{ev.startTime}</span>}
                                {ev.title}
                              </div>
                            );
                          })}
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
              ));
            })()}
          </div>
        </div>



        {/* Modern Modal Overlay */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
            <div className="bg-white w-full max-w-[500px] rounded-xl shadow-2xl overflow-hidden text-[#37352f]">
              {/* Modal Header */}
              <div className="px-5 py-3 border-b border-[#e9e9e8] flex items-center justify-between bg-[#fbfbfa]">
                <span className="text-sm font-medium text-[#787774]">
                  {isEditing ? '일정 편집' : '새로운 일정'}
                </span>
                <div className="flex items-center gap-1">
                  {isEditing && (
                    <button
                      onClick={handleDelete}
                      className="text-[#eb5757] hover:bg-[#ffefef] p-1.5 rounded transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-[#9b9a97] hover:text-[#37352f] hover:bg-[#efefef] p-1.5 rounded transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
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

                  {/* All Day Toggle */}
                  <div className="flex items-center h-8">
                    <div className="w-24 text-[#787774] flex items-center gap-2">
                      <Clock size={14} /> 종일
                    </div>
                    <button
                      onClick={() => setIsAllDay(!isAllDay)}
                      className={`
                      relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2383e2] focus:ring-offset-1
                      ${isAllDay ? 'bg-[#2383e2]' : 'bg-[#e9e9e8]'}
                    `}
                    >
                      <span
                        className={`
                        inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
                        ${isAllDay ? 'translate-x-5' : 'translate-x-1'}
                      `}
                      />
                    </button>
                    <span className="ml-3 text-xs text-[#787774]">{isAllDay ? '기한 없음' : '정해진 시간'}</span>
                  </div>

                  {/* Time (Conditional) */}
                  {!isAllDay && (
                    <div className="flex items-center h-8 animate-[fadeIn_0.2s_ease-out]">
                      <div className="w-24 text-[#787774] flex items-center gap-2">
                        <Clock size={14} className="opacity-0" /> 시간
                      </div>
                      <div className="flex items-center gap-2 flex-1 relative">
                        {/* Click-outside backdrop */}
                        {(showStartHourPicker || showStartMinPicker || showEndHourPicker || showEndMinPicker) && (
                          <div
                            className="fixed inset-0 z-50 bg-transparent"
                            onClick={() => {
                              setShowStartHourPicker(false);
                              setShowStartMinPicker(false);
                              setShowEndHourPicker(false);
                              setShowEndMinPicker(false);
                            }}
                          />
                        )}

                        {/* Start Time Group */}
                        <div className="flex items-center gap-1 relative z-[60]">
                          <button
                            onClick={() => {
                              const current = getAmPm(startTime);
                              setStartTime(to24hTime(get12hTime(startTime), current === '오전' ? '오후' : '오전'));
                            }}
                            className="px-2 py-1 rounded text-[11px] bg-[#fbfbfa] border border-[#e9e9e8] text-[#787774] hover:bg-[#efefef] transition-colors font-medium"
                          >
                            {getAmPm(startTime)}
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => {
                                setShowStartHourPicker(!showStartHourPicker);
                                setShowStartMinPicker(false);
                                setShowEndHourPicker(false);
                                setShowEndMinPicker(false);
                              }}
                              className="px-2 py-1 rounded bg-[#fbfbfa] border border-[#e9e9e8] text-[#37352f] hover:bg-[#efefef] min-w-[36px] text-center"
                            >
                              {get12hTime(startTime).split(':')[0]}시
                            </button>
                            {showStartHourPicker && (
                              <div className="absolute top-full left-0 mt-1 w-16 max-h-48 overflow-y-auto bg-white border border-[#e9e9e8] rounded-md shadow-lg z-[60]">
                                {hourOptions.map(h => (
                                  <button
                                    key={`sh-${h}`}
                                    onClick={() => {
                                      const [, m] = get12hTime(startTime).split(':');
                                      setStartTime(to24hTime(`${String(h).padStart(2, '0')}:${m}`, getAmPm(startTime)));
                                      setShowStartHourPicker(false);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#f7f7f5]"
                                  >
                                    {h}시
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="relative">
                            <button
                              onClick={() => {
                                setShowStartMinPicker(!showStartMinPicker);
                                setShowStartHourPicker(false);
                                setShowEndHourPicker(false);
                                setShowEndMinPicker(false);
                              }}
                              className="px-2 py-1 rounded bg-[#fbfbfa] border border-[#e9e9e8] text-[#37352f] hover:bg-[#efefef] min-w-[36px] text-center"
                            >
                              {startTime ? startTime.split(':')[1] : '00'}분
                            </button>
                            {showStartMinPicker && (
                              <div className="absolute top-full left-0 mt-1 w-16 max-h-48 overflow-y-auto bg-white border border-[#e9e9e8] rounded-md shadow-lg z-[60]">
                                {minuteOptions.map(m => (
                                  <button
                                    key={`sm-${m}`}
                                    onClick={() => {
                                      const h12 = get12hTime(startTime).split(':')[0];
                                      setStartTime(to24hTime(`${h12}:${m}`, getAmPm(startTime)));
                                      setShowStartMinPicker(false);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#f7f7f5]"
                                  >
                                    {m}분
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <span className="text-[#d3d1cb]">→</span>

                        {/* End Time Group */}
                        <div className="flex items-center gap-1 relative z-[60]">
                          <button
                            onClick={() => {
                              const current = getAmPm(endTime);
                              setEndTime(to24hTime(get12hTime(endTime), current === '오전' ? '오후' : '오전'));
                            }}
                            className="px-2 py-1 rounded text-[11px] bg-[#fbfbfa] border border-[#e9e9e8] text-[#787774] hover:bg-[#efefef] transition-colors font-medium"
                          >
                            {getAmPm(endTime)}
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => {
                                setShowEndHourPicker(!showEndHourPicker);
                                setShowStartHourPicker(false);
                                setShowStartMinPicker(false);
                                setShowEndMinPicker(false);
                              }}
                              className="px-2 py-1 rounded bg-[#fbfbfa] border border-[#e9e9e8] text-[#37352f] hover:bg-[#efefef] min-w-[36px] text-center"
                            >
                              {get12hTime(endTime).split(':')[0]}시
                            </button>
                            {showEndHourPicker && (
                              <div className="absolute top-full left-0 mt-1 w-16 max-h-48 overflow-y-auto bg-white border border-[#e9e9e8] rounded-md shadow-lg z-[60]">
                                {hourOptions.map(h => (
                                  <button
                                    key={`eh-${h}`}
                                    onClick={() => {
                                      const [, m] = get12hTime(endTime).split(':');
                                      setEndTime(to24hTime(`${String(h).padStart(2, '0')}:${m}`, getAmPm(endTime)));
                                      setShowEndHourPicker(false);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#f7f7f5]"
                                  >
                                    {h}시
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="relative">
                            <button
                              onClick={() => {
                                setShowEndMinPicker(!showEndMinPicker);
                                setShowStartHourPicker(false);
                                setShowStartMinPicker(false);
                                setShowEndHourPicker(false);
                              }}
                              className="px-2 py-1 rounded bg-[#fbfbfa] border border-[#e9e9e8] text-[#37352f] hover:bg-[#efefef] min-w-[36px] text-center"
                            >
                              {endTime ? endTime.split(':')[1] : '00'}분
                            </button>
                            {showEndMinPicker && (
                              <div className="absolute top-full left-0 mt-1 w-16 max-h-48 overflow-y-auto bg-white border border-[#e9e9e8] rounded-md shadow-lg z-[60]">
                                {minuteOptions.map(m => (
                                  <button
                                    key={`em-${m}`}
                                    onClick={() => {
                                      const h12 = get12hTime(endTime).split(':')[0];
                                      setEndTime(to24hTime(`${h12}:${m}`, getAmPm(endTime)));
                                      setShowEndMinPicker(false);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#f7f7f5]"
                                  >
                                    {m}분
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Type/Tag */}
                  <div className="flex items-center h-8">
                    <div className="w-24 text-[#787774] flex items-center gap-2">
                      <Check size={14} /> 태그
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {tags.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setType(t.id)}
                          className={`
                           px-2 py-0.5 rounded text-xs transition-colors border flex items-center gap-1.5
                           ${type === t.id
                              ? 'bg-[#37352f] text-white border-[#37352f]'
                              : 'bg-white text-[#787774] border-[#e9e9e8] hover:bg-[#efefef]'}
                        `}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
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
              <div className="p-3 bg-[#fbfbfa] border-t border-[#e9e9e8] flex justify-end items-center">
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
  } catch (error) {
    console.error("CalendarView render error:", error);
    return (
      <div className="p-8 text-center bg-white h-full flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-[#eb5757] mb-2">캘린더를 불러오는 중 오류가 발생했습니다.</h2>
        <p className="text-[#787774]">데이터 형식이 올바르지 않거나 로직 오류가 있을 수 있습니다.</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-[#37352f] text-white rounded-lg">페이지 새로고침</button>
      </div>
    );
  }
};

export default CalendarView;
