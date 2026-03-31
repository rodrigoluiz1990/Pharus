const AgendaModule = (() => {
    const LS_KEY = 'pharus_agenda_events_fallback';

    const monthLabelEl = document.getElementById('agendaMonthLabel');
    const weekdaysEl = document.querySelector('.agenda-weekdays');
    const calendarGridEl = document.getElementById('agendaCalendarGrid');
    const upcomingListEl = document.getElementById('agendaUpcomingList');
    const prevPeriodBtn = document.getElementById('agendaPrevMonthBtn');
    const nextPeriodBtn = document.getElementById('agendaNextMonthBtn');
    const viewDayBtn = document.getElementById('agendaViewDayBtn');
    const viewWeekBtn = document.getElementById('agendaViewWeekBtn');
    const viewMonthBtn = document.getElementById('agendaViewMonthBtn');
    const newEventBtn = document.getElementById('newAgendaEventBtn');

    const modalEl = document.getElementById('agendaEventModal');
    const modalContentEl = modalEl ? modalEl.querySelector('.modal') : null;
    const modalTitleEl = document.getElementById('agendaEventModalTitle');
    const closeModalBtn = document.getElementById('closeAgendaEventModal');
    const cancelBtn = document.getElementById('cancelAgendaEventBtn');
    const deleteBtn = document.getElementById('deleteAgendaEventBtn');
    const formEl = document.getElementById('agendaEventForm');

    const idEl = document.getElementById('agendaEventId');
    const titleEl = document.getElementById('agendaEventTitle');
    const typeEl = document.getElementById('agendaEventType');
    const startAtEl = document.getElementById('agendaEventStartAt');
    const endAtEl = document.getElementById('agendaEventEndAt');
    const startAtLabelEl = document.getElementById('agendaEventStartLabel');
    const endAtLabelEl = document.getElementById('agendaEventEndLabel');
    const startAtGroupEl = document.getElementById('agendaEventStartGroup');
    const endAtGroupEl = document.getElementById('agendaEventEndGroup');
    const statusEl = document.getElementById('agendaEventStatus');
    const allDayEl = document.getElementById('agendaEventAllDay');
    const repeatTypeEl = document.getElementById('agendaEventRepeatType');
    const repeatCountEl = document.getElementById('agendaEventRepeatCount');
    const descriptionEl = document.getElementById('agendaEventDescription');
    const colorEl = document.getElementById('agendaEventColor');

    const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const VIEW_DAY = 'day';
    const VIEW_WEEK = 'week';
    const VIEW_MONTH = 'month';
    const HOLIDAY_MIN_YEAR = 1900;
    const HOLIDAY_MAX_YEAR = 2100;

    let currentCursor = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    let currentView = VIEW_MONTH;
    let agendaEvents = [];
    let holidayEventsByDate = new Map();
    let isInitialized = false;
    let useLocalFallback = false;
    let fallbackNotified = false;
    let lastTimedStartValue = '';
    let lastTimedEndValue = '';
    const ensureAgendaPermission = (optionKey, message) => {
        if (typeof PermissionService === 'undefined' || typeof PermissionService.ensure !== 'function') return true;
        return PermissionService.ensure('agenda', optionKey, message || 'Você não tem permissão para executar esta ação.');
    };

    const notify = (message, type = 'info') => {
        if (window.UtilsModule && typeof window.UtilsModule.showNotification === 'function') {
            window.UtilsModule.showNotification(message, type);
            return;
        }
        console.log(`[${type}] ${message}`);
    };

    const showLoading = (message) => {
        if (window.UtilsModule && typeof window.UtilsModule.showLoading === 'function') {
            window.UtilsModule.showLoading(message || 'Carregando agenda...');
        }
    };

    const hideLoading = () => {
        if (window.UtilsModule && typeof window.UtilsModule.hideLoading === 'function') {
            window.UtilsModule.hideLoading();
        }
    };

    const escapeHtml = (value) => {
        if (window.UtilsModule && typeof window.UtilsModule.escapeHtml === 'function') {
            return window.UtilsModule.escapeHtml(String(value ?? ''));
        }
        const div = document.createElement('div');
        div.textContent = String(value ?? '');
        return div.innerHTML;
    };

    const isMissingTableError = (error) => {
        const raw = String(error?.message || error?.details || error || '').toLowerCase();
        return raw.includes('agenda_events') && (
            raw.includes('does not exist') ||
            raw.includes('relation') ||
            raw.includes('not found')
        );
    };

    const getLocalEvents = () => {
        try {
            const raw = localStorage.getItem(LS_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (_error) {
            return [];
        }
    };

    const saveLocalEvents = (items) => {
        localStorage.setItem(LS_KEY, JSON.stringify(Array.isArray(items) ? items : []));
    };

    const normalizeEvent = (item) => ({
        id: String(item?.id || ''),
        title: String(item?.title || '').trim(),
        description: String(item?.description || '').trim() || null,
        event_type: String(item?.event_type || 'event'),
        status: String(item?.status || 'pending'),
        start_at: item?.start_at || null,
        end_at: item?.end_at || null,
        is_all_day: Boolean(item?.is_all_day),
        event_color: normalizeEventColor(item?.event_color),
        created_at: item?.created_at || null,
        updated_at: item?.updated_at || null,
    });

    const normalizeEventColor = (value) => {
        const raw = String(value || '').trim();
        return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toLowerCase() : '#2f8ee5';
    };

    const isNumericId = (value) => /^[0-9]+$/.test(String(value || '').trim());

    const resolveCurrentUserId = async () => {
        try {
            const sessionResult = await window.dbClient.auth.getSession();
            const sessionUser = sessionResult?.data?.session?.user || null;
            const rawId = String(sessionUser?.id || '').trim();
            if (isNumericId(rawId)) {
                const { data: byId, error: byIdError } = await window.dbClient
                    .from('app_users')
                    .select('id')
                    .eq('id', Number(rawId))
                    .single();
                if (!byIdError && byId?.id != null) {
                    return Number(byId.id);
                }
            }

            const email = String(sessionUser?.email || '').trim().toLowerCase();
            if (!email) return null;

            const { data, error } = await window.dbClient
                .from('app_users')
                .select('id,email')
                .eq('email', email)
                .single();
            if (error || !data) return null;

            const mappedId = String(data.id || '').trim();
            return isNumericId(mappedId) ? Number(mappedId) : null;
        } catch (_error) {
            return null;
        }
    };

    const parseDateSafe = (value) => {
        const date = new Date(value || '');
        return Number.isNaN(date.getTime()) ? null : date;
    };

    const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const startOfWeek = (date) => {
        const base = startOfDay(date);
        base.setDate(base.getDate() - base.getDay());
        return base;
    };

    const addDays = (date, amount) => {
        const next = new Date(date);
        next.setDate(next.getDate() + amount);
        return startOfDay(next);
    };

    const addMonths = (date, amount) => {
        const next = new Date(date);
        next.setDate(1);
        next.setMonth(next.getMonth() + amount);
        return startOfDay(next);
    };

    const toDateKey = (date) => {
        if (!date) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getEasterDate = (year) => {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month - 1, day);
    };

    const buildHolidayEvent = (date, title) => {
        const base = startOfDay(date);
        const end = new Date(base);
        end.setHours(23, 59, 59, 999);
        const key = toDateKey(base);
        return {
            id: `holiday-${key}`,
            title,
            description: 'Feriado nacional',
            event_type: 'holiday',
            status: 'pending',
            start_at: base.toISOString(),
            end_at: end.toISOString(),
            is_all_day: true,
            created_at: null,
            updated_at: null,
        };
    };

    const buildHolidayEventsMap = (minYear, maxYear) => {
        const map = new Map();
        for (let year = minYear; year <= maxYear; year += 1) {
            const fixedDates = [
                [0, 1, 'Confraternização Universal'],
                [3, 21, 'Tiradentes'],
                [4, 1, 'Dia do Trabalho'],
                [8, 7, 'Independência do Brasil'],
                [9, 12, 'Nossa Senhora Aparecida'],
                [10, 2, 'Finados'],
                [10, 15, 'Proclamação da República'],
                [11, 25, 'Natal'],
            ];

            if (year >= 2024) {
                fixedDates.push([10, 20, 'Dia da Consciência Negra']);
            }

            const easter = getEasterDate(year);
            const goodFriday = addDays(easter, -2);
            const carnivalMonday = addDays(easter, -48);
            const carnival = addDays(easter, -47);
            const ashWednesday = addDays(easter, -46);
            const corpusChristi = addDays(easter, 60);

            const holidayDates = [
                ...fixedDates.map(([month, day, title]) => ({
                    date: new Date(year, month, day),
                    title,
                })),
                { date: goodFriday, title: 'Paixão de Cristo' },
                { date: carnivalMonday, title: 'Segunda de Carnaval' },
                { date: carnival, title: 'Carnaval' },
                { date: ashWednesday, title: 'Quarta-feira de Cinzas' },
                { date: corpusChristi, title: 'Corpus Christi' },
            ];

            holidayDates.forEach(({ date, title }) => {
                const key = toDateKey(date);
                const event = buildHolidayEvent(date, title);
                if (!map.has(key)) {
                    map.set(key, []);
                }
                map.get(key).push(event);
            });
        }
        return map;
    };

    const isSameDay = (isoDate, dayDate) => {
        const dt = parseDateSafe(isoDate);
        if (!dt || !dayDate) return false;
        return dt.getFullYear() === dayDate.getFullYear()
            && dt.getMonth() === dayDate.getMonth()
            && dt.getDate() === dayDate.getDate();
    };

    const formatDayTime = (isoDate, isAllDay) => {
        if (!isoDate) return isAllDay ? 'Dia inteiro' : '-';
        const date = parseDateSafe(isoDate);
        if (!date) return '-';
        if (isAllDay) return 'Dia inteiro';
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateTime = (isoDate) => {
        const date = parseDateSafe(isoDate);
        if (!date) return '-';
        return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const eventOccursOnDay = (event, dayDate) => {
        if (!event || !dayDate) return false;
        const eventStart = parseDateSafe(event.start_at);
        if (!eventStart) return false;

        const parsedEnd = parseDateSafe(event.end_at || event.start_at);
        const eventEnd = parsedEnd && parsedEnd >= eventStart ? parsedEnd : eventStart;

        const dayStart = startOfDay(dayDate);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        return eventStart <= dayEnd && eventEnd >= dayStart;
    };

    const getEventsForDay = (dayDate) => {
        const dateKey = toDateKey(dayDate);
        const holidays = holidayEventsByDate.get(dateKey) || [];
        const persisted = agendaEvents
            .filter((event) => eventOccursOnDay(event, dayDate))
            ;

        return [...holidays, ...persisted].sort((a, b) => {
            const aDate = parseDateSafe(a.start_at);
            const bDate = parseDateSafe(b.start_at);
            return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
        });
    };

    const hasHolidayEvent = (events) => (Array.isArray(events) ? events : []).some((event) => String(event?.event_type || '') === 'holiday');
    const isIntermediateSpanDay = (event, dayDate) => {
        if (!event || !dayDate) return false;
        const start = parseDateSafe(event.start_at);
        const end = parseDateSafe(event.end_at || event.start_at);
        if (!start || !end || end <= start) return false;

        const dayKey = startOfDay(dayDate).getTime();
        const startKey = startOfDay(start).getTime();
        const endKey = startOfDay(end).getTime();

        return dayKey > startKey && dayKey < endKey;
    };

    const getPeriodLabel = () => {
        if (currentView === VIEW_DAY) {
            return currentCursor.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        }

        if (currentView === VIEW_WEEK) {
            const weekStart = startOfWeek(currentCursor);
            const weekEnd = addDays(weekStart, 6);
            return `${weekStart.toLocaleDateString('pt-BR')} - ${weekEnd.toLocaleDateString('pt-BR')}`;
        }

        const monthBase = new Date(currentCursor.getFullYear(), currentCursor.getMonth(), 1);
        return monthBase.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    };

    const setWeekdays = () => {
        if (!weekdaysEl) return;

        if (currentView === VIEW_DAY) {
            weekdaysEl.style.display = 'none';
            return;
        }

        weekdaysEl.style.display = 'grid';

        if (currentView === VIEW_WEEK) {
            const weekStart = startOfWeek(currentCursor);
            weekdaysEl.innerHTML = WEEKDAY_SHORT.map((name, index) => {
                const day = addDays(weekStart, index);
                return `<span>${name} ${String(day.getDate()).padStart(2, '0')}</span>`;
            }).join('');
            return;
        }

        weekdaysEl.innerHTML = WEEKDAY_SHORT.map((name) => `<span>${name}</span>`).join('');
    };

    const buildEventChip = (event, dayDate = null) => {
        const typeClass = event.event_type === 'task'
            ? 'chip-task'
            : event.event_type === 'holiday'
                ? 'chip-holiday'
                : 'chip-event';
        const statusClass = `chip-status-${event.status}`;
        const intermediateDay = isIntermediateSpanDay(event, dayDate);
        const showAllDayLabel = Boolean(event.is_all_day) || intermediateDay;
        const chipTime = event.event_type === 'holiday'
            ? ''
            : `<span class="chip-time">${escapeHtml(formatDayTime(event.start_at, showAllDayLabel))}</span>`;
        const customColorStyle = event.event_type !== 'holiday' && event.event_color
            ? ` style="--event-color:${escapeHtml(normalizeEventColor(event.event_color))};"`
            : '';
        return `
            <button type="button" class="agenda-event-chip ${typeClass} ${statusClass}" data-event-id="${escapeHtml(event.id)}"${customColorStyle}>
                ${chipTime}
                <span class="chip-title">${escapeHtml(event.title || 'Sem titulo')}</span>
            </button>
        `;
    };

    const attachEventChipHandlers = () => {
        if (!calendarGridEl) return;
        calendarGridEl.querySelectorAll('[data-event-id]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                if (String(button.dataset.eventId || '').startsWith('holiday-')) {
                    notify('Feriado nacional.', 'info');
                    return;
                }
                const found = agendaEvents.find((item) => String(item.id) === String(button.dataset.eventId));
                if (found) openModal(found);
            });
        });
    };

    const renderMonthView = () => {
        if (!calendarGridEl) return;

        const year = currentCursor.getFullYear();
        const month = currentCursor.getMonth();
        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        const today = new Date();

        calendarGridEl.className = 'agenda-calendar-grid agenda-calendar-grid-month';
        calendarGridEl.innerHTML = '';

        for (let i = 0; i < 42; i += 1) {
            let dayNumber;
            let dayDate;
            let inCurrentMonth = true;

            if (i < firstWeekday) {
                dayNumber = daysInPrevMonth - firstWeekday + i + 1;
                dayDate = new Date(year, month - 1, dayNumber);
                inCurrentMonth = false;
            } else if (i >= firstWeekday + daysInMonth) {
                dayNumber = i - (firstWeekday + daysInMonth) + 1;
                dayDate = new Date(year, month + 1, dayNumber);
                inCurrentMonth = false;
            } else {
                dayNumber = i - firstWeekday + 1;
                dayDate = new Date(year, month, dayNumber);
            }

            const events = getEventsForDay(dayDate);
            const cell = document.createElement('button');
            cell.type = 'button';
            const holidayClass = hasHolidayEvent(events) ? 'has-holiday' : '';
            cell.className = `agenda-day ${inCurrentMonth ? '' : 'is-outside-month'} ${isSameDay(today.toISOString(), dayDate) ? 'is-today' : ''} ${holidayClass}`.trim();

            const chips = events.slice(0, 3).map((event) => buildEventChip(event, dayDate)).join('');
            const remaining = events.length > 3 ? `<div class="agenda-more">+${events.length - 3} item(ns)</div>` : '';

            cell.innerHTML = `
                <div class="agenda-day-number">${dayNumber}</div>
                <div class="agenda-day-events">${chips}${remaining}</div>
            `;

            cell.addEventListener('click', () => openModal(null, dayDate));
            calendarGridEl.appendChild(cell);
        }

        attachEventChipHandlers();
    };

    const renderWeekView = () => {
        if (!calendarGridEl) return;

        const weekStart = startOfWeek(currentCursor);
        const today = new Date();

        calendarGridEl.className = 'agenda-calendar-grid agenda-calendar-grid-week';
        calendarGridEl.innerHTML = '';

        for (let i = 0; i < 7; i += 1) {
            const dayDate = addDays(weekStart, i);
            const events = getEventsForDay(dayDate);
            const cell = document.createElement('button');
            cell.type = 'button';
            const holidayClass = hasHolidayEvent(events) ? 'has-holiday' : '';
            cell.className = `agenda-week-day ${isSameDay(today.toISOString(), dayDate) ? 'is-today' : ''} ${holidayClass}`.trim();

            cell.innerHTML = `
                <div class="agenda-week-day-header">${WEEKDAY_SHORT[dayDate.getDay()]} ${String(dayDate.getDate()).padStart(2, '0')}</div>
                <div class="agenda-week-day-events">
                    ${events.length ? events.map((event) => buildEventChip(event, dayDate)).join('') : '<div class="agenda-week-empty">🥳 Sem eventos</div>'}
                </div>
            `;

            cell.addEventListener('click', () => openModal(null, dayDate));
            calendarGridEl.appendChild(cell);
        }

        attachEventChipHandlers();
    };

    const renderDayView = () => {
        if (!calendarGridEl) return;

        const dayEvents = getEventsForDay(currentCursor);
        const hasHoliday = hasHolidayEvent(dayEvents);
        const today = new Date();

        calendarGridEl.className = 'agenda-calendar-grid agenda-calendar-grid-day';
        calendarGridEl.innerHTML = `
            <section class="agenda-day-panel ${isSameDay(today.toISOString(), currentCursor) ? 'is-today' : ''} ${hasHoliday ? 'has-holiday' : ''}">
                <header class="agenda-day-panel-header">
                    ${currentCursor.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </header>
                <div class="agenda-day-panel-events">
                    ${dayEvents.length ? dayEvents.map((event) => buildEventChip(event, currentCursor)).join('') : '<div class="agenda-day-empty">🥳 Nenhum evento para este dia.</div>'}
                </div>
            </section>
        `;

        const panel = calendarGridEl.querySelector('.agenda-day-panel');
        if (panel) {
            panel.addEventListener('click', () => openModal(null, currentCursor));
        }

        attachEventChipHandlers();
    };

    const setActiveViewButton = () => {
        const mapping = [
            [viewDayBtn, VIEW_DAY],
            [viewWeekBtn, VIEW_WEEK],
            [viewMonthBtn, VIEW_MONTH],
        ];

        mapping.forEach(([btn, mode]) => {
            if (!btn) return;
            btn.classList.toggle('active', currentView === mode);
        });
    };

    const renderCalendar = () => {
        if (!monthLabelEl) return;
        monthLabelEl.textContent = getPeriodLabel();
        setActiveViewButton();
        setWeekdays();

        if (currentView === VIEW_DAY) {
            renderDayView();
            return;
        }

        if (currentView === VIEW_WEEK) {
            renderWeekView();
            return;
        }

        renderMonthView();
    };

    const renderUpcoming = () => {
        if (!upcomingListEl) return;

        const now = new Date();
        const sorted = [...agendaEvents]
            .sort((a, b) => {
                const aDate = parseDateSafe(a.start_at);
                const bDate = parseDateSafe(b.start_at);
                return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
            })
            .filter((event) => {
                const end = parseDateSafe(event.end_at || event.start_at);
                return end && end >= startOfDay(now);
            })
            .slice(0, 10);

        if (!sorted.length) {
            upcomingListEl.innerHTML = '<div class="agenda-empty">🥳 Nenhum compromisso futuro cadastrado.</div>';
            return;
        }

        upcomingListEl.innerHTML = sorted.map((event) => {
            const typeText = event.event_type === 'task' ? 'Tarefa' : 'Evento';
            const statusText = event.status === 'done'
                ? 'Concluído'
                : event.status === 'cancelled'
                    ? 'Cancelado'
                    : 'Pendente';

            return `
                <button type="button" class="agenda-upcoming-item" data-event-id="${escapeHtml(event.id)}">
                    <div class="upcoming-title-row">
                        <span class="upcoming-title">${escapeHtml(event.title || 'Sem titulo')}</span>
                        <span class="upcoming-type">${typeText}</span>
                    </div>
                    <div class="upcoming-meta">
                        <span>${escapeHtml(formatDateTime(event.start_at))}</span>
                        <span class="dot">&middot;</span>
                        <span>${statusText}</span>
                    </div>
                </button>
            `;
        }).join('');

        upcomingListEl.querySelectorAll('[data-event-id]').forEach((button) => {
            button.addEventListener('click', () => {
                const found = agendaEvents.find((item) => String(item.id) === String(button.dataset.eventId));
                if (found) openModal(found);
            });
        });
    };

    const refreshAgenda = async () => {
        await loadEvents();
        renderCalendar();
        renderUpcoming();
    };

    const setModalVisible = (visible) => {
        if (!modalEl) return;
        modalEl.style.display = visible ? 'flex' : 'none';
    };

    const resetForm = () => {
        if (!formEl) return;
        formEl.reset();
        idEl.value = '';
        typeEl.value = 'event';
        statusEl.value = 'pending';
        allDayEl.checked = false;
        if (repeatTypeEl) repeatTypeEl.value = 'none';
        if (repeatCountEl) repeatCountEl.value = '2';
        if (colorEl) colorEl.value = '#2f8ee5';
        syncRepeatFields();
        lastTimedStartValue = '';
        lastTimedEndValue = '';
        applyAllDayMode(false);
        deleteBtn.style.display = 'none';
    };

    const toInputDateTime = (isoDate) => {
        if (!isoDate) return '';
        const date = new Date(isoDate);
        if (Number.isNaN(date.getTime())) return '';
        const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return adjusted.toISOString().slice(0, 16);
    };

    const toInputDate = (isoDate) => {
        if (!isoDate) return '';
        const date = new Date(isoDate);
        if (Number.isNaN(date.getTime())) return '';
        const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return adjusted.toISOString().slice(0, 10);
    };

    const toIsoFromInput = (value) => {
        if (!value) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [year, month, day] = value.split('-').map(Number);
            const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
            return localDate.toISOString();
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return date.toISOString();
    };

    const applyAllDayMode = (enabled) => {
        if (!startAtEl || !endAtEl) return;

        if (enabled) {
            if (startAtEl.type === 'datetime-local') {
                lastTimedStartValue = startAtEl.value || '';
            }
            if (endAtEl.type === 'datetime-local') {
                lastTimedEndValue = endAtEl.value || '';
            }

            const currentDate = /^\d{4}-\d{2}-\d{2}/.test(startAtEl.value || '')
                ? String(startAtEl.value).slice(0, 10)
                : toInputDate(new Date().toISOString());

            startAtEl.type = 'date';
            startAtEl.value = currentDate;
            startAtEl.required = true;
            if (startAtLabelEl) startAtLabelEl.textContent = 'Data *';
            if (endAtLabelEl) endAtLabelEl.textContent = 'Fim';
            if (endAtGroupEl) endAtGroupEl.style.display = 'none';
            return;
        }

        const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(startAtEl.value || '')
            ? startAtEl.value
            : '';

        startAtEl.type = 'datetime-local';
        startAtEl.required = true;
        if (startAtLabelEl) startAtLabelEl.textContent = 'Inicio *';
        startAtEl.value = lastTimedStartValue || (selectedDate ? `${selectedDate}T09:00` : '');

        endAtEl.type = 'datetime-local';
        if (endAtGroupEl) endAtGroupEl.style.display = '';
        endAtEl.value = lastTimedEndValue || (selectedDate ? `${selectedDate}T10:00` : '');
    };

    const fillFormForNew = (date) => {
        resetForm();
        modalTitleEl.textContent = 'Novo evento';

        const base = date ? new Date(date) : new Date();
        base.setHours(9, 0, 0, 0);
        const end = new Date(base);
        end.setHours(10, 0, 0, 0);

        startAtEl.value = toInputDateTime(base.toISOString());
        endAtEl.value = toInputDateTime(end.toISOString());
        lastTimedStartValue = startAtEl.value;
        lastTimedEndValue = endAtEl.value;
    };

    const fillFormForEdit = (event) => {
        resetForm();
        idEl.value = event.id;
        modalTitleEl.textContent = 'Editar item da agenda';
        titleEl.value = event.title || '';
        typeEl.value = event.event_type || 'event';
        lastTimedStartValue = toInputDateTime(event.start_at);
        lastTimedEndValue = toInputDateTime(event.end_at);
        startAtEl.value = lastTimedStartValue;
        endAtEl.value = lastTimedEndValue;
        statusEl.value = event.status || 'pending';
        allDayEl.checked = Boolean(event.is_all_day);
        applyAllDayMode(Boolean(event.is_all_day));
        if (allDayEl.checked) {
            startAtEl.value = toInputDate(event.start_at);
        }
        descriptionEl.value = event.description || '';
        if (colorEl) colorEl.value = normalizeEventColor(event.event_color);
        deleteBtn.style.display = 'inline-flex';
    };

    const openModal = (event, dateForNew) => {
        if (event) {
            if (!ensureAgendaPermission('edit', 'Você não tem permissão para editar eventos da agenda.')) return;
        } else if (!ensureAgendaPermission('create', 'Você não tem permissão para criar eventos da agenda.')) {
            return;
        }
        if (event) fillFormForEdit(event);
        else fillFormForNew(dateForNew || null);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
    };

    const getPayloadFromForm = async () => {
        const title = String(titleEl.value || '').trim();
        if (!title) {
            notify('Informe o titulo.', 'warning');
            return null;
        }

        const startIsoRaw = toIsoFromInput(startAtEl.value);
        if (!startIsoRaw) {
            notify('Informe uma data de inicio valida.', 'warning');
            return null;
        }

        let startIso = startIsoRaw;
        let endIso = toIsoFromInput(endAtEl.value);

        if (allDayEl.checked) {
            const allDayStart = parseDateSafe(startIsoRaw);
            if (allDayStart) {
                allDayStart.setHours(0, 0, 0, 0);
                startIso = allDayStart.toISOString();
                const allDayEnd = new Date(allDayStart);
                allDayEnd.setHours(23, 59, 0, 0);
                endIso = allDayEnd.toISOString();
            }
        }

        if (endIso && new Date(endIso) < new Date(startIso)) {
            notify('A data de fim deve ser maior ou igual ao inicio.', 'warning');
            return null;
        }

        const userId = await resolveCurrentUserId();

        const repeatType = repeatTypeEl ? String(repeatTypeEl.value || 'none') : 'none';
        const repeatCountRaw = repeatCountEl ? Number(repeatCountEl.value) : 1;
        const repeatCount = Number.isFinite(repeatCountRaw)
            ? Math.max(2, Math.min(60, Math.trunc(repeatCountRaw)))
            : 2;

        const payload = {
            title,
            description: String(descriptionEl.value || '').trim() || null,
            event_type: typeEl.value === 'task' ? 'task' : 'event',
            status: ['pending', 'done', 'cancelled'].includes(statusEl.value) ? statusEl.value : 'pending',
            start_at: startIso,
            end_at: endIso,
            is_all_day: Boolean(allDayEl.checked),
            event_color: normalizeEventColor(colorEl?.value),
            updated_at: new Date().toISOString(),
            repeat_type: ['none', 'daily', 'weekly', 'monthly'].includes(repeatType) ? repeatType : 'none',
            repeat_count: repeatCount,
        };

        if (Number.isFinite(userId) && userId > 0) {
            payload.created_by = userId;
        }

        return payload;
    };

    const shiftDateByFrequency = (date, repeatType, index) => {
        const next = new Date(date);
        if (repeatType === 'daily') {
            next.setDate(next.getDate() + index);
            return next;
        }
        if (repeatType === 'weekly') {
            next.setDate(next.getDate() + (index * 7));
            return next;
        }
        if (repeatType === 'monthly') {
            next.setMonth(next.getMonth() + index);
            return next;
        }
        return next;
    };

    const buildRecurringPayloads = (basePayload) => {
        const repeatType = String(basePayload.repeat_type || 'none');
        const repeatCount = Number(basePayload.repeat_count || 1);

        const cleanBase = { ...basePayload };
        delete cleanBase.repeat_type;
        delete cleanBase.repeat_count;

        if (repeatType === 'none' || repeatCount < 2) {
            return [cleanBase];
        }

        const startBase = parseDateSafe(basePayload.start_at);
        const endBase = parseDateSafe(basePayload.end_at || basePayload.start_at);
        if (!startBase || !endBase) {
            return [cleanBase];
        }

        const payloads = [];
        for (let i = 0; i < repeatCount; i += 1) {
            const shiftedStart = shiftDateByFrequency(startBase, repeatType, i);
            const shiftedEnd = shiftDateByFrequency(endBase, repeatType, i);
            payloads.push({
                ...cleanBase,
                start_at: shiftedStart.toISOString(),
                end_at: shiftedEnd.toISOString(),
            });
        }

        return payloads;
    };

    const syncRepeatFields = () => {
        if (!repeatTypeEl || !repeatCountEl) return;
        const disabled = String(repeatTypeEl.value || 'none') === 'none';
        repeatCountEl.disabled = disabled;
    };

    const insertLocal = (payload) => {
        const item = {
            ...payload,
            id: String(Date.now()),
            created_at: new Date().toISOString(),
        };
        const next = [...agendaEvents, item];
        agendaEvents = next;
        saveLocalEvents(next);
    };

    const updateLocal = (id, payload) => {
        const next = agendaEvents.map((item) => {
            if (String(item.id) !== String(id)) return item;
            return {
                ...item,
                ...payload,
                id: item.id,
                updated_at: new Date().toISOString(),
            };
        });
        agendaEvents = next;
        saveLocalEvents(next);
    };

    const deleteLocal = (id) => {
        const next = agendaEvents.filter((item) => String(item.id) !== String(id));
        agendaEvents = next;
        saveLocalEvents(next);
    };

    const saveEvent = async (ev) => {
        ev.preventDefault();
        const eventId = idEl.value;
        const permissionKey = eventId ? 'edit' : 'create';
        if (!ensureAgendaPermission(permissionKey, eventId ? 'Você não tem permissão para editar eventos da agenda.' : 'Você não tem permissão para criar eventos da agenda.')) {
            return;
        }

        const payloadWithRepeat = await getPayloadFromForm();
        if (!payloadWithRepeat) return;

        showLoading('Salvando agenda...');
        try {
            const repeatType = String(payloadWithRepeat.repeat_type || 'none');
            const repeatCount = Number(payloadWithRepeat.repeat_count || 1);

            if (useLocalFallback) {
                if (eventId) {
                    const updatePayload = { ...payloadWithRepeat };
                    delete updatePayload.repeat_type;
                    delete updatePayload.repeat_count;
                    updateLocal(eventId, updatePayload);
                } else {
                    const inserts = buildRecurringPayloads(payloadWithRepeat);
                    inserts.forEach((item) => insertLocal(item));
                }
            } else if (eventId) {
                const updatePayload = { ...payloadWithRepeat };
                delete updatePayload.repeat_type;
                delete updatePayload.repeat_count;
                delete updatePayload.created_by;
                const { error } = await window.dbClient
                    .from('agenda_events')
                    .update(updatePayload)
                    .eq('id', eventId);
                if (error) throw error;
            } else {
                const insertPayloads = buildRecurringPayloads(payloadWithRepeat).map((item) => {
                    const copy = { ...item };
                    delete copy.updated_at;
                    return copy;
                });
                const { error } = await window.dbClient
                    .from('agenda_events')
                    .insert(insertPayloads);
                if (error) throw error;
            }

            if (!eventId && repeatType !== 'none' && repeatCount > 1) {
                notify(`Compromissos salvos com repeticao (${repeatCount} ocorrencias).`, 'success');
            } else {
                notify('Compromisso salvo com sucesso.', 'success');
            }
            closeModal();
            await refreshAgenda();
        } catch (error) {
            console.error('Erro ao salvar agenda:', error);
            notify(`Falha ao salvar: ${error.message || 'erro inesperado'}`, 'error');
        } finally {
            hideLoading();
        }
    };

    const deleteEvent = async () => {
        if (!ensureAgendaPermission('delete', 'Você não tem permissão para excluir eventos da agenda.')) return;
        const eventId = idEl.value;
        if (!eventId) return;
        if (!window.confirm('Deseja excluir este item da agenda?')) return;

        showLoading('Excluindo item...');
        try {
            if (useLocalFallback) {
                deleteLocal(eventId);
            } else {
                const { error } = await window.dbClient
                    .from('agenda_events')
                    .delete()
                    .eq('id', eventId);
                if (error) throw error;
            }

            notify('Item removido com sucesso.', 'success');
            closeModal();
            await refreshAgenda();
        } catch (error) {
            console.error('Erro ao excluir agenda:', error);
            notify(`Falha ao excluir: ${error.message || 'erro inesperado'}`, 'error');
        } finally {
            hideLoading();
        }
    };

    const movePeriod = (direction) => {
        if (currentView === VIEW_DAY) {
            currentCursor = addDays(currentCursor, direction);
            renderCalendar();
            return;
        }

        if (currentView === VIEW_WEEK) {
            currentCursor = addDays(currentCursor, direction * 7);
            renderCalendar();
            return;
        }

        currentCursor = addMonths(currentCursor, direction);
        renderCalendar();
    };

    const setView = (viewMode) => {
        const safeView = [VIEW_DAY, VIEW_WEEK, VIEW_MONTH].includes(viewMode) ? viewMode : VIEW_MONTH;
        currentView = safeView;
        renderCalendar();
    };

    const attachEvents = () => {
        if (prevPeriodBtn) prevPeriodBtn.addEventListener('click', () => movePeriod(-1));
        if (nextPeriodBtn) nextPeriodBtn.addEventListener('click', () => movePeriod(1));

        if (viewDayBtn) viewDayBtn.addEventListener('click', () => setView(VIEW_DAY));
        if (viewWeekBtn) viewWeekBtn.addEventListener('click', () => setView(VIEW_WEEK));
        if (viewMonthBtn) viewMonthBtn.addEventListener('click', () => setView(VIEW_MONTH));

        if (newEventBtn) {
            const canCreate = typeof PermissionService === 'undefined' || typeof PermissionService.has !== 'function'
                ? true
                : PermissionService.has('agenda', 'create');
            newEventBtn.disabled = !canCreate;
            newEventBtn.addEventListener('click', () => openModal(null, currentCursor));
        }

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (deleteBtn) deleteBtn.addEventListener('click', () => void deleteEvent());

        if (formEl) formEl.addEventListener('submit', (event) => void saveEvent(event));
        if (allDayEl) {
            allDayEl.addEventListener('change', () => {
                applyAllDayMode(Boolean(allDayEl.checked));
            });
        }
        if (repeatTypeEl) {
            repeatTypeEl.addEventListener('change', syncRepeatFields);
        }

        if (modalEl) {
            if (modalContentEl) {
                ['mousedown', 'mouseup', 'click'].forEach((eventName) => {
                    modalContentEl.addEventListener(eventName, (event) => {
                        event.stopPropagation();
                    });
                });
            }
        }
    };

    const loadEvents = async () => {
        showLoading('Carregando agenda...');
        try {
            const { data, error } = await window.dbClient
                .from('agenda_events')
                .select('*')
                .order('start_at', { ascending: true });

            if (error) throw error;

            useLocalFallback = false;
            agendaEvents = (Array.isArray(data) ? data : []).map(normalizeEvent);
        } catch (error) {
            if (isMissingTableError(error)) {
                useLocalFallback = true;
                agendaEvents = getLocalEvents().map(normalizeEvent);
                if (!fallbackNotified) {
                    notify('Tabela agenda_events nao encontrada. Usando armazenamento local temporario.', 'warning');
                    fallbackNotified = true;
                }
            } else {
                console.error('Erro ao carregar agenda:', error);
                notify(`Erro ao carregar agenda: ${error.message || 'falha inesperada'}`, 'error');
            }
        } finally {
            hideLoading();
        }
    };

    const init = async () => {
        if (isInitialized) return;
        if (!ensureAgendaPermission('view', 'Você não tem permissão para visualizar a agenda.')) return;
        isInitialized = true;
        holidayEventsByDate = buildHolidayEventsMap(HOLIDAY_MIN_YEAR, HOLIDAY_MAX_YEAR);

        attachEvents();
        syncRepeatFields();
        await refreshAgenda();
    };

    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        void AgendaModule.init();
    });
} else {
    void AgendaModule.init();
}


