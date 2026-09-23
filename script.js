// ==========================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================
let examsBank = [];              
let registeredGroups = [];       
let currentExamQuestions = [];   
let editingExamId = null;        
let activeExamForPreview = null; 
let evaluationHistory = [];      

// Credenciales por defecto
let teacherProfile = {
  username: 'Luisa Arango',
  password: '1234',
  subject: '',
  bio: '',
  avatar: 'https://via.placeholder.com/100'
};

let studentName = '';
let exitAttemptsCount = 0;
let secondsElapsed = 0;
let timerInterval = null;

// ==========================================
// 1. CARGA INICIAL Y AUTENTICACIÓN
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  // Cargar perfil docente o inicializar por defecto
  const savedProfile = localStorage.getItem('prof_profile');
  if (savedProfile) {
    try { teacherProfile = { ...teacherProfile, ...JSON.parse(savedProfile) }; } catch (e) {}
  } else {
    localStorage.setItem('prof_profile', JSON.stringify(teacherProfile));
  }

  const savedExams = localStorage.getItem('exams_bank');
  if (savedExams) {
    try { examsBank = JSON.parse(savedExams); } catch (e) {}
  }

  const savedGroups = localStorage.getItem('registered_groups');
  if (savedGroups) {
    try { registeredGroups = JSON.parse(savedGroups); } catch (e) {}
  }

  const savedHistory = localStorage.getItem('evaluation_history');
  if (savedHistory) {
    try { evaluationHistory = JSON.parse(savedHistory); } catch (e) {}
  }

  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  const sharedExamId = urlParams.get('examId');

  const loginMod = document.getElementById('loginModule');
  const teacherMod = document.getElementById('teacherModule');
  const studentMod = document.getElementById('studentModule');

  // Modo Estudiante mediante enlace directo
  if (mode === 'student' || sharedExamId) {
    if (loginMod) loginMod.style.display = 'none';
    if (teacherMod) teacherMod.style.display = 'none';
    if (studentMod) {
      studentMod.classList.remove('hidden');
      studentMod.style.display = 'block';
    }

    const targetExam = examsBank.find(e => e.id === parseInt(sharedExamId));
    if (targetExam) {
      setTimeout(() => startStudentExam(targetExam), 200);
    } else {
      alert('El examen solicitado no se encuentra registrado en este dispositivo.');
    }
  } else {
    // Modo Docente: Validar sesión iniciada
    const isLoggedIn = sessionStorage.getItem('teacher_logged_in');
    if (isLoggedIn === 'true') {
      showTeacherPanel();
    } else {
      showLoginForm();
    }
  }
});

function showLoginForm() {
  document.getElementById('loginModule').style.display = 'block';
  document.getElementById('teacherModule').style.display = 'none';
  document.getElementById('studentModule').style.display = 'none';
}

function showTeacherPanel() {
  document.getElementById('loginModule').style.display = 'none';
  const teacherMod = document.getElementById('teacherModule');
  teacherMod.classList.remove('hidden');
  teacherMod.style.display = 'block';

  loadProfileFields();
  renderGroupsList();
  renderExamsBank();
}

// Evento de inicio de sesión
document.getElementById('loginForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();

  if (user === teacherProfile.username && pass === teacherProfile.password) {
    sessionStorage.setItem('teacher_logged_in', 'true');
    showTeacherPanel();
  } else {
    alert('Usuario o contraseña incorrectos.');
  }
});

function logoutTeacher() {
  sessionStorage.removeItem('teacher_logged_in');
  showLoginForm();
}

function saveBankToStorage() {
  localStorage.setItem('exams_bank', JSON.stringify(examsBank));
}

function saveGroupsToStorage() {
  localStorage.setItem('registered_groups', JSON.stringify(registeredGroups));
}

function saveHistoryToStorage() {
  localStorage.setItem('evaluation_history', JSON.stringify(evaluationHistory));
}

// ==========================================
// 2. NAVEGACIÓN DE PESTAÑAS
// ==========================================
function switchTab(tabId) {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    tab.classList.add('hidden-tab');
    tab.classList.remove('active-tab');
  });

  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => btn.classList.remove('active'));

  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.classList.remove('hidden-tab');
    targetTab.classList.add('active-tab');
  }

  const activeBtn = Array.from(navBtns).find(btn => btn.getAttribute('onclick').includes(tabId));
  if (activeBtn) activeBtn.classList.add('active');

  if (tabId === 'historyTab') {
    populateHistoryExamFilter();
    renderHistoryTable();
  }
}

// ==========================================
// 3. GESTIÓN DE PERFIL Y GRUPOS
// ==========================================
function loadProfileFields() {
  if (document.getElementById('profNameInput')) document.getElementById('profNameInput').value = teacherProfile.username || '';
  if (document.getElementById('profPassInput')) document.getElementById('profPassInput').value = teacherProfile.password || '';
  if (document.getElementById('profSubjectInput')) document.getElementById('profSubjectInput').value = teacherProfile.subject || '';
  if (document.getElementById('profBioInput')) document.getElementById('profBioInput').value = teacherProfile.bio || '';
  if (document.getElementById('avatarImage') && teacherProfile.avatar) {
    document.getElementById('avatarImage').src = teacherProfile.avatar;
  }
}

function updateProfile() {
  const name = document.getElementById('profNameInput')?.value.trim() || teacherProfile.username;
  const pass = document.getElementById('profPassInput')?.value.trim() || teacherProfile.password;
  const subject = document.getElementById('profSubjectInput')?.value.trim() || '';
  const bio = document.getElementById('profBioInput')?.value.trim() || '';

  teacherProfile.username = name;
  teacherProfile.password = pass;
  teacherProfile.subject = subject;
  teacherProfile.bio = bio;

  localStorage.setItem('prof_profile', JSON.stringify(teacherProfile));
}

document.getElementById('avatarInput')?.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      teacherProfile.avatar = event.target.result;
      const img = document.getElementById('avatarImage');
      if (img) img.src = teacherProfile.avatar;
      localStorage.setItem('prof_profile', JSON.stringify(teacherProfile));
    };
    reader.readAsDataURL(file);
  }
});

function addGroup() {
  const input = document.getElementById('newGroupNameInput');
  const groupName = input ? input.value.trim() : '';

  if (!groupName) {
    alert('Ingresa el nombre del grupo.');
    return;
  }

  if (registeredGroups.includes(groupName)) {
    alert('Este grupo ya está registrado.');
    return;
  }

  registeredGroups.push(groupName);
  saveGroupsToStorage();
  input.value = '';
  renderGroupsList();
}

function removeGroup(groupName) {
  if (confirm(`¿Eliminar el grupo "${groupName}"?`)) {
    registeredGroups = registeredGroups.filter(g => g !== groupName);
    saveGroupsToStorage();
    renderGroupsList();
  }
}

function renderGroupsList() {
  const container = document.getElementById('groupsListContainer');
  if (!container) return;
  container.innerHTML = '';

  if (registeredGroups.length === 0) {
    container.innerHTML = '<p class="empty-text">No hay grupos registrados aún.</p>';
    return;
  }

  registeredGroups.forEach(group => {
    const chip = document.createElement('div');
    chip.className = 'group-chip';
    chip.innerHTML = `
      <span>👥 ${group}</span>
      <button class="chip-remove" onclick="removeGroup('${group}')">&times;</button>
    `;
    container.appendChild(chip);
  });
}

function populateGroupSelect(selectedGroup = '') {
  const select = document.getElementById('examGroupSelect');
  if (!select) return;

  select.innerHTML = '<option value="">-- Sin Grupo / General --</option>';
  registeredGroups.forEach(group => {
    const opt = document.createElement('option');
    opt.value = group;
    opt.textContent = group;
    if (group === selectedGroup) opt.selected = true;
    select.appendChild(opt);
  });
}

// ==========================================
// 4. OPCIONES DINÁMICAS Y CREACIÓN DE EXÁMENES
// ==========================================
function resetOptionFields() {
  const container = document.getElementById('dynamicOptionsContainer');
  if (!container) return;
  container.innerHTML = '';
  addOptionField();
  addOptionField();
}

function addOptionField(textValue = '') {
  const container = document.getElementById('dynamicOptionsContainer');
  if (!container) return;

  const currentCount = container.children.length;
  const letter = String.fromCharCode(65 + currentCount);

  const row = document.createElement('div');
  row.className = 'opt-row';
  row.innerHTML = `
    <input type="radio" name="correctOpt" value="${currentCount}" ${currentCount === 0 ? 'checked' : ''}>
    <input type="text" class="opt-input" placeholder="Opción ${letter}" value="${textValue}">
    ${currentCount >= 2 ? `<button type="button" class="btn-danger-sm" onclick="removeOptionField(this)">×</button>` : '<span style="width: 24px;"></span>'}
  `;
  container.appendChild(row);
  reindexOptions();
}

function removeOptionField(button) {
  const container = document.getElementById('dynamicOptionsContainer');
  if (container.children.length <= 2) {
    alert('Debe haber al menos 2 opciones de respuesta.');
    return;
  }
  button.parentElement.remove();
  reindexOptions();
}

function reindexOptions() {
  const container = document.getElementById('dynamicOptionsContainer');
  const rows = container.querySelectorAll('.opt-row');

  rows.forEach((row, index) => {
    const radio = row.querySelector('input[type="radio"]');
    const input = row.querySelector('.opt-input');
    const letter = String.fromCharCode(65 + index);

    radio.value = index;
    input.placeholder = `Opción ${letter}`;

    let delBtn = row.querySelector('.btn-danger-sm');
    if (rows.length <= 2) {
      if (delBtn) delBtn.remove();
    } else if (!delBtn) {
      delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-danger-sm';
      delBtn.textContent = '×';
      delBtn.onclick = function() { removeOptionField(this); };
      row.appendChild(delBtn);
    }
  });
}

function openExamCreator(examId = null) {
  const section = document.getElementById('examCreatorSection');
  if (section) {
    section.classList.remove('hidden');
    section.style.display = 'block';
  }

  if (examId) {
    const exam = examsBank.find(e => e.id === examId);
    if (!exam) return;

    editingExamId = exam.id;
    document.getElementById('creatorTitle').textContent = 'Editar Examen';
    document.getElementById('examTitleInput').value = exam.title;
    document.getElementById('examTimeInput').value = exam.timeLimit;
    populateGroupSelect(exam.group || '');
    currentExamQuestions = JSON.parse(JSON.stringify(exam.questions));
  } else {
    editingExamId = null;
    document.getElementById('creatorTitle').textContent = 'Nuevo Examen';
    document.getElementById('examTitleInput').value = '';
    document.getElementById('examTimeInput').value = '30';
    populateGroupSelect('');
    currentExamQuestions = [];
  }

  resetOptionFields();
  renderCurrentExamQuestions();
}

function closeExamCreator() {
  const section = document.getElementById('examCreatorSection');
  if (section) section.classList.add('hidden');
  currentExamQuestions = [];
  editingExamId = null;
}

function toggleOptionFields() {
  const type = document.getElementById('newQuestionType').value;
  const optionsBlock = document.getElementById('multipleOptionsBlock');
  if (optionsBlock) {
    optionsBlock.style.display = (type === 'multiple') ? 'block' : 'none';
  }
}

function addQuestionToCurrentExam() {
  const textInput = document.getElementById('newQuestionText');
  const pointsInput = document.getElementById('newQuestionPoints');
  const text = textInput ? textInput.value.trim() : '';
  const type = document.getElementById('newQuestionType').value;
  const points = pointsInput ? parseFloat(pointsInput.value) || 1 : 1;

  if (!text) {
    alert('Ingresa el enunciado de la pregunta.');
    return;
  }

  const question = {
    id: Date.now(),
    type: type,
    text: text,
    points: points
  };

  if (type === 'multiple') {
    const optInputs = document.querySelectorAll('.opt-input');
    const options = Array.from(optInputs).map(i => i.value.trim());
    const selectedRadio = document.querySelector('input[name="correctOpt"]:checked');

    if (options.length < 2) {
      alert('Debes incluir al menos 2 opciones.');
      return;
    }

    if (options.some(o => o === '')) {
      alert('Completa todas las opciones de respuesta creadas.');
      return;
    }

    question.options = options;
    question.correctIndex = selectedRadio ? parseInt(selectedRadio.value) : 0;
  }

  currentExamQuestions.push(question);

  if (textInput) textInput.value = '';
  if (pointsInput) pointsInput.value = '1';
  resetOptionFields();

  renderCurrentExamQuestions();
}

function removeQuestionFromCurrentExam(id) {
  currentExamQuestions = currentExamQuestions.filter(q => q.id !== id);
  renderCurrentExamQuestions();
}

function renderCurrentExamQuestions() {
  const container = document.getElementById('currentExamQuestionsList');
  if (!container) return;
  container.innerHTML = '';

  if (currentExamQuestions.length === 0) {
    container.innerHTML = '<p class="empty-text">Aún no hay preguntas agregadas.</p>';
    return;
  }

  currentExamQuestions.forEach((q, index) => {
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;';
    div.innerHTML = `
      <div>
        <strong>${index + 1}. ${q.text}</strong> 
        <small style="color: #666;">(${q.type === 'multiple' ? q.options.length + ' opciones' : 'Abierta'} - ${q.points} pts)</small>
      </div>
      <button class="btn btn-danger-sm" onclick="removeQuestionFromCurrentExam(${q.id})">Eliminar</button>
    `;
    container.appendChild(div);
  });
}

function saveExamToBank() {
  const titleInput = document.getElementById('examTitleInput');
  const groupSelect = document.getElementById('examGroupSelect');
  const timeInput = document.getElementById('examTimeInput');
  const title = titleInput ? titleInput.value.trim() : '';
  const group = groupSelect ? groupSelect.value : '';
  const timeLimit = timeInput ? parseInt(timeInput.value) || 30 : 30;

  if (!title) {
    alert('Asigna un título al examen.');
    return;
  }

  if (currentExamQuestions.length === 0) {
    alert('Agrega al menos una pregunta antes de guardar.');
    return;
  }

  if (editingExamId) {
    const index = examsBank.findIndex(e => e.id === editingExamId);
    if (index !== -1) {
      examsBank[index] = { id: editingExamId, title, group, timeLimit, questions: [...currentExamQuestions] };
    }
  } else {
    examsBank.push({ id: Date.now(), title, group, timeLimit, questions: [...currentExamQuestions] });
  }

  saveBankToStorage();
  closeExamCreator();
  renderExamsBank();
}

function deleteExamFromBank(id) {
  if (confirm('¿Deseas eliminar este examen del banco?')) {
    examsBank = examsBank.filter(e => e.id !== id);
    saveBankToStorage();
    renderExamsBank();
  }
}

function renderExamsBank() {
  const container = document.getElementById('examsBankContainer');
  if (!container) return;
  container.innerHTML = '';

  if (examsBank.length === 0) {
    container.innerHTML = '<p class="empty-text">No hay exámenes en el banco.</p>';
    return;
  }

  examsBank.forEach((exam) => {
    const card = document.createElement('div');
    card.style.cssText = 'background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 12px;';

    const studentShareUrl = `${window.location.origin}${window.location.pathname}?mode=student&examId=${exam.id}`;
    const submissionCount = evaluationHistory.filter(h => h.examId === exam.id).length;
    const groupTag = exam.group ? `👥 Grupo: <strong>${exam.group}</strong> | ` : '';

    card.innerHTML = `
      <h3>${exam.title}</h3>
      <p style="font-size:0.85rem; color: #666; margin: 6px 0 12px;">
        ${groupTag}⏱️ ${exam.timeLimit} min | ❓ ${exam.questions.length} preguntas | 📝 Respuestas recibidas: <strong>${submissionCount}</strong>
      </p>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="btn" onclick="previewExam(${exam.id})">Probar Examen</button>
        <button class="btn btn-secondary" onclick="openExamCreator(${exam.id})">Editar</button>
        <button class="btn btn-secondary" onclick="copyShareLink('${studentShareUrl}')">🔗 Copiar Link Estudiante</button>
        <button class="btn btn-danger-sm" onclick="deleteExamFromBank(${exam.id})">Eliminar</button>
      </div>
    `;

    container.appendChild(card);
  });
}

function copyShareLink(url) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(() => {
      alert('¡Enlace exclusivo para estudiantes copiado!');
    }).catch(() => prompt('Copia este enlace para enviarlo a los estudiantes:', url));
  } else {
    prompt('Copia este enlace para enviarlo a los estudiantes:', url);
  }
}

// ==========================================
// 5. HISTORIAL INDEPENDIENTE POR EXAMEN
// ==========================================
function populateHistoryExamFilter() {
  const select = document.getElementById('historyExamFilter');
  if (!select) return;

  select.innerHTML = '';

  if (examsBank.length === 0) {
    select.innerHTML = '<option value="">-- No hay exámenes registrados --</option>';
    return;
  }

  examsBank.forEach(exam => {
    const opt = document.createElement('option');
    opt.value = exam.id;
    opt.textContent = `${exam.title} ${exam.group ? '(' + exam.group + ')' : ''}`;
    select.appendChild(opt);
  });
}

function renderHistoryTable() {
  const container = document.getElementById('historyListContainer');
  const select = document.getElementById('historyExamFilter');
  if (!container || !select) return;

  container.innerHTML = '';
  const selectedExamId = parseInt(select.value);

  if (!selectedExamId) {
    container.innerHTML = '<p class="empty-text">No hay ningún examen seleccionado.</p>';
    return;
  }

  const filteredHistory = evaluationHistory.filter(record => record.examId === selectedExamId);

  if (filteredHistory.length === 0) {
    container.innerHTML = '<p class="empty-text">Aún no hay entregas o respuestas registradas para este examen.</p>';
    return;
  }

  let html = `
    <div style="margin-bottom: 12px; font-size: 0.9rem; color: var(--text-muted);">
      Mostrando <strong>${filteredHistory.length}</strong> entregas registradas.
    </div>
    <div style="overflow-x: auto;">
      <table style="width:100%; border-collapse:collapse; font-size:0.9rem; text-align:left;">
        <thead>
          <tr style="border-bottom:2px solid #ddd; background:#f4f4f4;">
            <th style="padding:10px;">Estudiante</th>
            <th style="padding:10px;">Grupo</th>
            <th style="padding:10px;">Nota Estimada</th>
            <th style="padding:10px;">Tiempo</th>
            <th style="padding:10px;">Intentos Salida</th>
            <th style="padding:10px;">Fecha / Hora</th>
          </tr>
        </thead>
        <tbody>`;

  filteredHistory.forEach(record => {
    html += `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:10px;"><strong>${record.estudiante}</strong></td>
        <td style="padding:10px;">${record.grupo || 'N/A'}</td>
        <td style="padding:10px; font-weight:bold; color:var(--primary-color);">${record.notaFinal} / 5.0</td>
        <td style="padding:10px;">${record.tiempoEmpleado}</td>
        <td style="padding:10px; text-align:center;">${record.intentosSalida > 0 ? `⚠️ ${record.intentosSalida}` : '0'}</td>
        <td style="padding:10px; font-size:0.8rem; color:#666;">${record.fecha}</td>
      </tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

// ==========================================
// 6. MÓDULO ESTUDIANTE
// ==========================================
function previewExam(examId) {
  const exam = examsBank.find(e => e.id === examId);
  if (!exam) return;
  
  document.getElementById('teacherModule').style.display = 'none';
  const studentMod = document.getElementById('studentModule');
  studentMod.classList.remove('hidden');
  studentMod.style.display = 'block';

  startStudentExam(exam);
}

function startStudentExam(exam) {
  const nameInput = prompt(`Bienvenido/a a la evaluación: "${exam.title}"\n\nIngresa tu nombre completo para comenzar:`);
  
  if (!nameInput || nameInput.trim() === '') {
    alert('El nombre es obligatorio.');
    if (window.location.search.includes('examId')) {
      window.location.href = window.location.pathname;
    }
    return;
  }

  studentName = nameInput.trim();
  exitAttemptsCount = 0;
  activeExamForPreview = exam;

  document.getElementById('previewTitle').textContent = `Evaluación: ${exam.title} ${exam.group ? '('+exam.group+')' : ''} — Estudiante: ${studentName}`;
  
  renderPreviewQuestions(exam);
  startTimer();
  activateExamProtection();
}

function startTimer() {
  clearInterval(timerInterval);
  secondsElapsed = 0;
  
  timerInterval = setInterval(() => {
    secondsElapsed++;
    const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    const display = document.getElementById('previewTimerDisplay');
    if (display) display.textContent = `⏱️ ${mins}:${secs}`;
  }, 1000);
}

function activateExamProtection() {
  window.onbeforeunload = function () {
    if (activeExamForPreview) {
      return "⚠️ Salir o recargar afectará tu nota.";
    }
  };

  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

function handleVisibilityChange() {
  if (document.hidden && activeExamForPreview) {
    exitAttemptsCount++;
    alert(`⚠️ ¡ATENCIÓN ${studentName}! Salir de la pestaña queda registrado (${exitAttemptsCount} veces).`);
  }
}

function deactivateExamProtection() {
  window.onbeforeunload = null;
  document.removeEventListener('visibilitychange', handleVisibilityChange);
}

function renderPreviewQuestions(exam) {
  const container = document.getElementById('previewQuestionsContainer');
  if (!container) return;
  container.innerHTML = '';

  exam.questions.forEach((q, index) => {
    const qDiv = document.createElement('div');
    qDiv.style.cssText = 'background: #f9f9f9; border: 1px solid #ddd; padding: 14px; border-radius: 8px; margin-bottom: 14px;';

    let content = `
      <div style="font-weight:600; margin-bottom: 8px; display: flex; justify-content: space-between;">
        <span>${index + 1}. ${q.text}</span>
        <span style="color: #666; font-size: 0.85rem;">[${q.points || 1} pts]</span>
      </div>`;

    if (q.type === 'multiple') {
      content += `<div style="display:flex; flex-direction:column; gap:6px;">`;
      q.options.forEach((opt, optIndex) => {
        content += `
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="radio" name="preview_question_${q.id}" value="${optIndex}" required>
            ${opt}
          </label>
        `;
      });
      content += `</div>`;
    } else {
      content += `
        <textarea name="preview_question_${q.id}" rows="3" placeholder="Escribe tu respuesta..." style="width:100%; padding:8px; box-sizing:border-box;" required></textarea>
      `;
    }

    qDiv.innerHTML = content;
    container.appendChild(qDiv);
  });
}

// ==========================================
// 7. ENVÍO Y CALIFICACIÓN
// ==========================================
document.getElementById('previewExamForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  if (!activeExamForPreview) return;

  clearInterval(timerInterval);
  deactivateExamProtection();

  const mins = Math.floor(secondsElapsed / 60);
  const secs = secondsElapsed % 60;
  const timeTakenStr = `${mins}m ${secs}s`;

  let totalScoreEarned = 0;
  let maxPossibleScore = 0;
  let correctCount = 0;
  let totalMultipleCount = 0;
  let responsesLog = [];

  activeExamForPreview.questions.forEach((q) => {
    const points = q.points || 1;
    maxPossibleScore += points;

    if (q.type === 'multiple') {
      totalMultipleCount++;
      const selected = document.querySelector(`[name="preview_question_${q.id}"]:checked`);
      const selectedIndex = selected ? parseInt(selected.value) : -1;
      const isCorrect = selectedIndex === q.correctIndex;

      if (isCorrect) {
        correctCount++;
        totalScoreEarned += points;
      }

      responsesLog.push({
        pregunta: q.text,
        tipo: 'Opción Múltiple',
        puntosPosibles: points,
        puntosObtenidos: isCorrect ? points : 0,
        respuestaDada: selectedIndex !== -1 ? q.options[selectedIndex] : 'Sin responder',
        estado: isCorrect ? 'Correcta' : 'Incorrecta',
        opcionCorrecta: q.options[q.correctIndex]
      });
    } else {
      const openText = document.querySelector(`[name="preview_question_${q.id}"]`)?.value || '';
      responsesLog.push({
        pregunta: q.text,
        tipo: 'Abierta',
        puntosPosibles: points,
        puntosObtenidos: 'Pendiente',
        respuestaDada: openText,
        estado: 'Pendiente de revisión',
        opcionCorrecta: 'N/A'
      });
    }
  });

  const finalGrade = maxPossibleScore > 0 ? ((totalScoreEarned / maxPossibleScore) * 5.0).toFixed(2) : '0.00';

  const resultRecord = {
    id: Date.now(),
    examId: activeExamForPreview.id,
    estudiante: studentName,
    grupo: activeExamForPreview.group || 'N/A',
    examenTitle: activeExamForPreview.title,
    fecha: new Date().toLocaleString(),
    tiempoEmpleado: timeTakenStr,
    respuestasCorrectas: `${correctCount} de ${totalMultipleCount}`,
    puntuacionTotal: `${totalScoreEarned.toFixed(1)} / ${maxPossibleScore.toFixed(1)}`,
    notaFinal: finalGrade,
    intentosSalida: exitAttemptsCount,
    detalles: responsesLog
  };

  evaluationHistory.push(resultRecord);
  saveHistoryToStorage();

  const scoreDetails = document.getElementById('scoreDetails');
  scoreDetails.innerHTML = `
    <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px;">
      <p>👤 <strong>Estudiante:</strong> ${studentName}</p>
      <p>👥 <strong>Grupo:</strong> ${activeExamForPreview.group || 'Sin grupo'}</p>
      <p>⏱️ <strong>Tiempo empleado:</strong> ${timeTakenStr}</p>
      <p>🏆 <strong>Puntuación en preguntas de opción múltiple:</strong> ${totalScoreEarned.toFixed(1)} / ${maxPossibleScore.toFixed(1)} pts</p>
      <p style="font-size: 1.2rem; margin-top: 6px;">📊 <strong>Nota estimada:</strong> <strong>${finalGrade} / 5.0</strong></p>
    </div>
  `;

  document.getElementById('previewSection').style.display = 'none';
  document.getElementById('resultsContainer').classList.remove('hidden');
  activeExamForPreview = null;
});

// ==========================================
// 8. EXPORTACIÓN A EXCEL POR EXAMEN SELECCIONADO
// ==========================================
function exportToExcel() {
  const select = document.getElementById('historyExamFilter');
  const selectedExamId = select ? parseInt(select.value) : null;

  if (!selectedExamId) {
    alert('Selecciona un examen para exportar su historial.');
    return;
  }

  const selectedExam = examsBank.find(e => e.id === selectedExamId);
  const filteredHistory = evaluationHistory.filter(record => record.examId === selectedExamId);

  if (filteredHistory.length === 0) {
    alert('No hay respuestas registradas para este examen.');
    return;
  }

  const rows = [];

  filteredHistory.forEach(record => {
    record.detalles.forEach((item, index) => {
      rows.push({
        'Estudiante': record.estudiante,
        'Grupo': record.grupo || 'N/A',
        'Examen': record.examenTitle,
        'Fecha / Hora': record.fecha,
        '# Pregunta': index + 1,
        'Pregunta': item.pregunta,
        'Tipo': item.tipo,
        'Respuesta Estudiante': item.respuestaDada,
        'Estado': item.estado,
        'Puntos Obtenidos': item.puntosObtenidos,
        'Puntos Posibles': item.puntosPosibles,
        'Opción Correcta': item.opcionCorrecta,
        'Nota Final (0-5)': record.notaFinal,
        'Intentos de Salida': record.intentosSalida,
        'Tiempo Empleado': record.tiempoEmpleado
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');

  const fileName = selectedExam ? `Reporte_${selectedExam.title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx` : 'Reporte_Examen.xlsx';
  XLSX.writeFile(workbook, fileName);
}