class BirthdayReminder {
    constructor() {
        this.birthdays = JSON.parse(localStorage.getItem('birthdays')) || [];
        this.editingId = null;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.init();
    }

    init() {
        this.renderAll();
        this.setupEventListeners();
        this.updateStats();
        this.setupMobileFeatures();
        
        // Восстановление из резервной копии при необходимости
        this.restoreBackup();
    }

    // Настройка мобильных функций
    setupMobileFeatures() {
        if (this.isMobile) {
            // Улучшаем поле даты для мобильных
            this.enhanceDateInput();
            
            // Добавляем свайпы для навигации (опционально)
            this.setupSwipeGestures();
        }
    }

    // Улучшение поля ввода даты
    enhanceDateInput() {
        const dateInput = document.getElementById('birthdate');
        const dateISOInput = document.getElementById('birthdateISO');
        
        // Настройки для мобильного ввода
        dateInput.setAttribute('inputmode', 'numeric');
        dateInput.setAttribute('autocomplete', 'off');
        
        // Обработчик ввода с маской
        dateInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            // Применяем маску ДД.ММ.ГГГГ
            if (value.length > 0 && value.length <= 2) {
                value = value;
            } else if (value.length > 2 && value.length <= 4) {
                value = value.substring(0, 2) + '.' + value.substring(2);
            } else if (value.length > 4 && value.length <= 8) {
                value = value.substring(0, 2) + '.' + value.substring(2, 4) + '.' + value.substring(4);
            } else if (value.length > 8) {
                value = value.substring(0, 2) + '.' + value.substring(2, 4) + '.' + value.substring(4, 8);
            }
            
            dateInput.value = value;
            
            // Преобразуем в ISO формат при вводе полной даты
            if (value.length === 10) {
                const [day, month, year] = value.split('.');
                const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                if (this.isValidDate(isoDate)) {
                    dateISOInput.value = isoDate;
                }
            }
        });
        
        // При фокусе показываем подсказку о формате
        dateInput.addEventListener('focus', () => {
            if (!dateInput.value) {
                dateInput.placeholder = 'дд.мм.гггг';
            }
        });
        
        // При потере фокуса проверяем корректность
        dateInput.addEventListener('blur', () => {
            if (dateInput.value && dateInput.value.length === 10) {
                const [day, month, year] = dateInput.value.split('.');
                const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                
                if (!this.isValidDate(isoDate)) {
                    alert('Пожалуйста, введите корректную дату');
                    dateInput.focus();
                } else {
                    dateISOInput.value = isoDate;
                }
            }
        });
    }

    // Настройка жестов свайпа
    setupSwipeGestures() {
        let startX, startY;
        const threshold = 50; // минимальное расстояние для свайпа
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            // Если горизонтальный свайп сильнее вертикального
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
                if (diffX > 0) {
                    // Свайп влево - переключение месяца фильтра вперед
                    this.swipeMonthFilter(1);
                } else {
                    // Свайп вправо - переключение месяца фильтра назад
                    this.swipeMonthFilter(-1);
                }
            }
            
            startX = null;
            startY = null;
        });
    }

    // Переключение фильтра месяца по свайпу
    swipeMonthFilter(direction) {
        const monthFilter = document.getElementById('monthFilter');
        const currentIndex = monthFilter.selectedIndex;
        const maxIndex = monthFilter.options.length - 1;
        
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = maxIndex;
        if (newIndex > maxIndex) newIndex = 0;
        
        monthFilter.selectedIndex = newIndex;
        this.renderAll();
        
        // Визуальная обратная связь
        const monthNames = ['Все месяцы', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                          'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        this.showToast(`Фильтр: ${monthNames[newIndex]}`, 1500);
    }

    // Всплывающее уведомление
    showToast(message, duration = 2000) {
        // Удаляем старый тост если есть
        const oldToast = document.querySelector('.toast');
        if (oldToast) oldToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            z-index: 10000;
            font-size: 14px;
            animation: toastSlideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Сохранение в localStorage
    save() {
        localStorage.setItem('birthdays', JSON.stringify(this.birthdays));
        this.updateStats();
    }

    // Восстановление из резервной копии
    restoreBackup() {
        const backup = localStorage.getItem('birthdays_backup');
        if (backup && (!this.birthdays || this.birthdays.length === 0)) {
            try {
                this.birthdays = JSON.parse(backup);
                this.save();
                this.renderAll();
            } catch (e) {
                console.error('Ошибка восстановления:', e);
            }
        }
    }

    // Добавление/редактирование
    addOrEditPerson(personData) {
        if (this.editingId !== null) {
            // Редактирование
            const index = this.birthdays.findIndex(p => p.id === this.editingId);
            if (index !== -1) {
                this.birthdays[index] = { ...this.birthdays[index], ...personData };
            }
            this.editingId = null;
        } else {
            // Добавление
            const newPerson = {
                id: Date.now(),
                ...personData
            };
            this.birthdays.push(newPerson);
        }
        this.save();
        this.renderAll();
        
        // Показываем уведомление
        this.showToast(this.editingId !== null ? 'Запись обновлена' : 'Запись добавлена', 2000);
    }

    // Удаление
    deletePerson(id) {
        if (confirm('Удалить эту запись?')) {
            this.birthdays = this.birthdays.filter(p => p.id !== id);
            this.save();
            this.renderAll();
            this.showToast('Запись удалена', 2000);
        }
    }

    // Начало редактирования
    startEdit(id) {
        this.editingId = id;
        const person = this.birthdays.find(p => p.id === id);
        if (person) {
            document.getElementById('name').value = person.name;
            
            // Форматируем дату для отображения
            const birthDate = new Date(person.birthdate);
            const day = birthDate.getDate().toString().padStart(2, '0');
            const month = (birthDate.getMonth() + 1).toString().padStart(2, '0');
            const year = birthDate.getFullYear();
            
            document.getElementById('birthdate').value = `${day}.${month}.${year}`;
            document.getElementById('birthdateISO').value = person.birthdate;
            document.getElementById('notes').value = person.notes || '';
            document.getElementById('modalTitle').textContent = 'Редактировать запись';
            this.openModal();
        }
    }

    // Форматирование даты для отображения
    formatDisplayDate(dateStr) {
        const date = new Date(dateStr);
        const options = { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            weekday: 'long' 
        };
        return date.toLocaleDateString('ru-RU', options);
    }

    // Возраст/дни до ДР
    getBirthdayInfo(birthdate) {
        const today = new Date();
        const currentYear = today.getFullYear();
        const birthDate = new Date(birthdate);
        const nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
        
        if (nextBirthday < today) {
            nextBirthday.setFullYear(currentYear + 1);
        }
        
        const diffTime = nextBirthday - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const age = nextBirthday.getFullYear() - birthDate.getFullYear();
        
        return { diffDays, age, nextBirthday };
    }

    // Проверка корректности даты
    isValidDate(dateStr) {
        const date = new Date(dateStr);
        return date instanceof Date && !isNaN(date) && dateStr.length === 10;
    }

    // Рендеринг карточки
    renderBirthdayCard(person) {
        const info = this.getBirthdayInfo(person.birthdate);
        const today = new Date();
        const birthDate = new Date(person.birthdate);
        
        let className = 'birthday-card';
        if (today.getDate() === birthDate.getDate() && 
            today.getMonth() === birthDate.getMonth()) {
            className += ' today';
        } else if (info.diffDays <= 30) {
            className += ' soon';
        }
        
        // Форматируем дату для отображения
        const displayDate = this.formatDisplayDate(person.birthdate);
        
        // Форматируем информацию о предстоящем ДР
        let birthdayInfo = '';
        if (info.diffDays === 0) {
            birthdayInfo = '<strong>🎉 Сегодня празднует!</strong>';
        } else if (info.diffDays === 1) {
            birthdayInfo = `<strong>Завтра!</strong> (исполнится ${info.age} лет)`;
        } else if (info.diffDays <= 7) {
            birthdayInfo = `Через ${info.diffDays} ${this.getDayWord(info.diffDays)} (исполнится ${info.age} лет)`;
        } else {
            birthdayInfo = `Через ${info.diffDays} ${this.getDayWord(info.diffDays)} (исполнится ${info.age} лет)`;
        }
        
        return `
            <div class="${className}" data-id="${person.id}">
                <div class="card-actions">
                    <button class="action-btn edit-btn" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="person-name">${person.name}</div>
                <div class="birthday-date">
                    <i class="far fa-calendar"></i> ${displayDate}
                </div>
                <div class="birthday-info">
                    <i class="fas fa-cake-candles"></i> ${birthdayInfo}
                </div>
                ${person.notes ? `
                    <div class="person-notes">
                        <i class="far fa-sticky-note"></i> ${person.notes}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Склонение слова "день"
    getDayWord(days) {
        if (days % 10 === 1 && days % 100 !== 11) return 'день';
        if (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20)) return 'дня';
        return 'дней';
    }

    // Рендеринг всех карточек
    renderAll() {
        const list = document.getElementById('birthdaysList');
        const upcomingList = document.getElementById('upcomingList');
        const monthFilter = document.getElementById('monthFilter').value;
        
        // Сортировка по ближайшему ДР
        const sorted = [...this.birthdays].sort((a, b) => {
            const infoA = this.getBirthdayInfo(a.birthdate);
            const infoB = this.getBirthdayInfo(b.birthdate);
            return infoA.diffDays - infoB.diffDays;
        });
        
        // Фильтрация
        const filtered = monthFilter === 'all' 
            ? sorted 
            : sorted.filter(p => new Date(p.birthdate).getMonth() === parseInt(monthFilter));
        
        // Ближайшие (до 30 дней)
        const upcoming = sorted.filter(p => {
            const info = this.getBirthdayInfo(p.birthdate);
            return info.diffDays <= 30 && info.diffDays > 0;
        }).slice(0, 3);
        
        // Отображение сообщений если нет данных
        list.innerHTML = filtered.length ? 
            filtered.map(p => this.renderBirthdayCard(p)).join('') :
            '<div class="no-data"><i class="fas fa-inbox"></i><p>Нет записей. Добавьте первую запись!</p></div>';
        
        upcomingList.innerHTML = upcoming.length ? 
            upcoming.map(p => this.renderBirthdayCard(p)).join('') :
            '<div class="no-data"><i class="fas fa-bell-slash"></i><p>Ближайших дней рождения нет</p></div>';
        
        this.attachCardListeners();
        
        // Добавляем стили для no-data
        if (!document.querySelector('#no-data-styles')) {
            const style = document.createElement('style');
            style.id = 'no-data-styles';
            style.textContent = `
                .no-data {
                    text-align: center;
                    padding: 40px 20px;
                    color: #7f8c8d;
                    grid-column: 1 / -1;
                }
                .no-data i {
                    font-size: 48px;
                    margin-bottom: 15px;
                    opacity: 0.5;
                }
                .no-data p {
                    font-size: 18px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Статистика
    updateStats() {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const currentMonth = today.getMonth();
        
        const todayCount = this.birthdays.filter(p => {
            const birthDate = new Date(p.birthdate);
            return birthDate.getDate() === today.getDate() && 
                   birthDate.getMonth() === today.getMonth();
        }).length;
        
        const monthCount = this.birthdays.filter(p => {
            return new Date(p.birthdate).getMonth() === currentMonth;
        }).length;
        
        document.getElementById('todayCount').textContent = todayCount;
        document.getElementById('monthCount').textContent = monthCount;
        document.getElementById('totalCount').textContent = this.birthdays.length;
        
        // Сохраняем резервную копию
        localStorage.setItem('birthdays_backup', JSON.stringify(this.birthdays));
    }

    // Открытие модального окна
    openModal() {
        document.getElementById('personModal').style.display = 'block';
        // Фокус на первое поле
        setTimeout(() => document.getElementById('name').focus(), 100);
    }

    // Закрытие модального окна
    closeModal() {
        document.getElementById('personModal').style.display = 'none';
        document.getElementById('personForm').reset();
        document.getElementById('birthdateISO').value = '';
        document.getElementById('modalTitle').textContent = 'Добавить человека';
        this.editingId = null;
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        const modal = document.getElementById('personModal');
        const form = document.getElementById('personForm');
        const addBtn = document.getElementById('addBtn');
        const closeBtns = document.querySelectorAll('.close, .close-btn');
        const monthFilter = document.getElementById('monthFilter');
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');

        // Добавление
        addBtn.addEventListener('click', () => {
            this.openModal();
        });

        // Закрытие модалки
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Закрытие по клику вне
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                this.closeModal();
            }
        });

        // Отправка формы
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const nameInput = document.getElementById('name').value.trim();
            const dateInput = document.getElementById('birthdate').value.trim();
            const dateISOInput = document.getElementById('birthdateISO').value;
            const notesInput = document.getElementById('notes').value.trim();
            
            // Валидация имени
            if (!nameInput) {
                alert('Пожалуйста, введите имя');
                document.getElementById('name').focus();
                return;
            }
            
            // Валидация даты
            if (!dateInput || dateInput.length !== 10) {
                alert('Пожалуйста, введите дату в формате ДД.ММ.ГГГГ');
                document.getElementById('birthdate').focus();
                return;
            }
            
            if (!dateISOInput || !this.isValidDate(dateISOInput)) {
                alert('Пожалуйста, введите корректную дату');
                document.getElementById('birthdate').focus();
                return;
            }
            
            const formData = {
                name: nameInput,
                birthdate: dateISOInput,
                notes: notesInput
            };
            
            this.addOrEditPerson(formData);
            this.closeModal();
        });

        // Фильтрация
        monthFilter.addEventListener('change', () => {
            this.renderAll();
        });

        // Экспорт данных
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.exportData();
        });

        // Импорт данных
        importBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.importData();
        });

        // Сохранение при закрытии вкладки
        window.addEventListener('beforeunload', () => {
            localStorage.setItem('birthdays_backup', JSON.stringify(this.birthdays));
        });
    }

    // Экспорт данных
    exportData() {
        const dataStr = JSON.stringify(this.birthdays, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `birthdays-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('Данные экспортированы', 2000);
    }

    // Импорт данных
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (Array.isArray(data)) {
                        // Подтверждение импорта
                        if (confirm(`Импортировать ${data.length} записей? Существующие данные будут сохранены.`)) {
                            // Сохраняем старые данные
                            const oldData = [...this.birthdays];
                            
                            // Объединяем данные, избегая дубликатов по id
                            const newData = [...oldData];
                            data.forEach(item => {
                                if (!newData.some(existing => existing.id === item.id)) {
                                    newData.push(item);
                                }
                            });
                            
                            this.birthdays = newData;
                            this.save();
                            this.renderAll();
                            this.showToast(`Импортировано ${data.length} записей`, 3000);
                        }
                    } else {
                        alert('Файл содержит некорректные данные');
                    }
                } catch (error) {
                    alert('Ошибка чтения файла: ' + error.message);
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    // Обработчики для карточек
    attachCardListeners() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.birthday-card');
                const id = parseInt(card.dataset.id);
                this.startEdit(id);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.birthday-card');
                const id = parseInt(card.dataset.id);
                this.deletePerson(id);
            });
        });
        
        // Клик по карточке на мобильных (опционально)
        if (this.isMobile) {
            document.querySelectorAll('.birthday-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    // Если клик не по кнопке действий
                    if (!e.target.closest('.card-actions')) {
                        const id = parseInt(card.dataset.id);
                        // Можно добавить дополнительное действие, например:
                        // this.showQuickActions(id);
                    }
                });
            });
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const app = new BirthdayReminder();
    
    // Глобальные функции для отладки
    window.birthdayApp = app;
    
    // Добавляем CSS для тостов
    const toastStyles = document.createElement('style');
    toastStyles.textContent = `
        @keyframes toastSlideIn {
            from {
                opacity: 0;
                transform: translate(-50%, 20px);
            }
            to {
                opacity: 1;
                transform: translate(-50%, 0);
            }
        }
        @keyframes toastSlideOut {
            from {
                opacity: 1;
                transform: translate(-50%, 0);
            }
            to {
                opacity: 0;
                transform: translate(-50%, 20px);
            }
        }
    `;
    document.head.appendChild(toastStyles);
    
    // Автоматическое обновление в полночь
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            app.renderAll();
            app.updateStats();
        }
    }, 60000); // Проверяем каждую минуту
    
    // Обновляем каждые 10 минут на всякий случай
    setInterval(() => {
        app.updateStats();
    }, 600000);
    
    // Проверяем есть ли сегодня дни рождения при загрузке
    const today = new Date();
    const todayBirthdays = app.birthdays.filter(p => {
        const birthDate = new Date(p.birthdate);
        return birthDate.getDate() === today.getDate() && 
               birthDate.getMonth() === today.getMonth();
    });
    
    if (todayBirthdays.length > 0) {
        setTimeout(() => {
            app.showToast(`🎉 Сегодня празднуют: ${todayBirthdays.map(p => p.name).join(', ')}`, 5000);
        }, 1000);
    }
});
