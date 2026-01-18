class BirthdayReminder {
    constructor() {
        this.birthdays = JSON.parse(localStorage.getItem('birthdays')) || [];
        this.editingId = null;
        this.init();
    }

    init() {
        this.renderAll();
        this.setupEventListeners();
        this.updateStats();
    }

    // Сохранение в localStorage
    save() {
        localStorage.setItem('birthdays', JSON.stringify(this.birthdays));
        this.updateStats();
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
    }

    // Удаление
    deletePerson(id) {
        if (confirm('Удалить эту запись?')) {
            this.birthdays = this.birthdays.filter(p => p.id !== id);
            this.save();
            this.renderAll();
        }
    }

    // Начало редактирования
    startEdit(id) {
        this.editingId = id;
        const person = this.birthdays.find(p => p.id === id);
        if (person) {
            document.getElementById('name').value = person.name;
            document.getElementById('birthdate').value = person.birthdate;
            document.getElementById('notes').value = person.notes || '';
            document.getElementById('modalTitle').textContent = 'Редактировать запись';
            this.openModal();
        }
    }

    // Форматирование даты
    formatDate(dateStr) {
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
                    <i class="far fa-calendar"></i> ${this.formatDate(person.birthdate)}
                </div>
                <div class="birthday-info">
                    <i class="fas fa-cake-candles"></i> 
                    ${info.diffDays === 0 ? 
                        '<strong>Сегодня! 🎉</strong>' : 
                        `Через ${info.diffDays} дней (исполнится ${info.age} лет)`}
                </div>
                ${person.notes ? `
                    <div class="person-notes">
                        <i class="far fa-sticky-note"></i> ${person.notes}
                    </div>
                ` : ''}
            </div>
        `;
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
        
        list.innerHTML = filtered.length ? 
            filtered.map(p => this.renderBirthdayCard(p)).join('') :
            '<p class="no-data">Нет записей</p>';
        
        upcomingList.innerHTML = upcoming.length ? 
            upcoming.map(p => this.renderBirthdayCard(p)).join('') :
            '<p class="no-data">Ближайших дней рождения нет</p>';
        
        this.attachCardListeners();
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
    }

    // Открытие модального окна
    openModal() {
        document.getElementById('personModal').style.display = 'block';
    }

    // Закрытие модального окна
    closeModal() {
        document.getElementById('personModal').style.display = 'none';
        document.getElementById('personForm').reset();
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

        // Отправка формы
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                name: document.getElementById('name').value.trim(),
                birthdate: document.getElementById('birthdate').value,
                notes: document.getElementById('notes').value.trim()
            };
            
            if (formData.name && formData.birthdate) {
                this.addOrEditPerson(formData);
                this.closeModal();
            }
        });

        // Фильтрация
        monthFilter.addEventListener('change', () => {
            this.renderAll();
        });

        // Экспорт данных
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.exportData();
            }
        });
    }

    // Обработчики для карточек
    attachCardListeners() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.birthday-card');
                const id = parseInt(card.dataset.id);
                this.startEdit(id);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.birthday-card');
                const id = parseInt(card.dataset.id);
                this.deletePerson(id);
            });
        });
    }

    // Экспорт данных
    exportData() {
        const dataStr = JSON.stringify(this.birthdays, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'birthdays-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Данные экспортированы в файл birthdays-backup.json');
    }

    // Импорт данных (опционально)
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (Array.isArray(data)) {
                this.birthdays = data;
                this.save();
                this.renderAll();
                alert(`Импортировано ${data.length} записей`);
            }
        } catch (error) {
            alert('Ошибка импорта данных');
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const app = new BirthdayReminder();
    
    // Для импорта данных (можно добавить кнопку в UI)
    window.importBirthdays = function(jsonData) {
        app.importData(jsonData);
    };
    
    // Автоматическое обновление в полночь
    setInterval(() => {
        app.renderAll();
        app.updateStats();
    }, 60000); // Каждую минуту проверяем
});