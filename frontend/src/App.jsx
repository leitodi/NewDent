import { useEffect, useMemo, useState } from 'react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const today = new Date();

const buildDays = (monthDate) => {
  const days = [];
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const totalCells = 42;

  for (let i = 0; i < totalCells; i += 1) {
    const dayNumber = i - startWeekDay + 1;
    if (dayNumber <= 0 || dayNumber > lastDay.getDate()) {
      days.push(null);
    } else {
      days.push(new Date(year, month, dayNumber));
    }
  }
  return days;
};

const modules = [
  { key: 'agenda', label: 'Agenda' },
  { key: 'clientes', label: 'Pacientes' },
  { key: 'caja', label: 'Caja' },
];

function BrandLogo() {
  return (
    <img src="/newdent-logo.jpeg" alt="Logo Odontologia Garibaldi" className="brand-logo" />
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="whatsapp-icon" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.2a9.8 9.8 0 0 0-8.34 14.95L2.2 21.8l4.78-1.43A9.8 9.8 0 1 0 12 2.2zm0 17.82a8.02 8.02 0 0 1-4.08-1.11l-.29-.17-2.84.85.85-2.76-.19-.29A8.02 8.02 0 1 1 12 20.02zm4.4-6.02c-.24-.12-1.4-.69-1.62-.77-.21-.08-.37-.12-.53.12-.16.24-.61.77-.75.93-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.22-.72-.64-1.2-1.44-1.34-1.68-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.28-.73-1.76-.19-.45-.38-.39-.53-.4h-.45c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.11.15 1.52.09.46-.07 1.4-.57 1.6-1.11.2-.55.2-1.02.14-1.11-.06-.09-.22-.14-.46-.26z"
      />
    </svg>
  );
}

function LoadingOverlay({ text }) {
  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-card">
        <div className="loading-spinner" aria-hidden="true" />
        <p>{text}</p>
      </div>
    </div>
  );
}

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const normalizeWhatsAppPhone = (phone) => {
  if (!phone) return '';

  let normalized = String(phone).replace(/\D/g, '');
  if (!normalized) return '';

  if (normalized.startsWith('00')) {
    normalized = normalized.slice(2);
  }

  if (!normalized.startsWith('54') && (normalized.length === 10 || normalized.length === 11)) {
    normalized = `54${normalized.replace(/^0/, '')}`;
  }

  if (normalized.startsWith('54')) {
    normalized = normalized.replace(/^54(\d{2,4})15/, '54$1');
  }

  return normalized;
};

const formatWhatsAppDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-AR');
};

const buildWhatsAppUrl = (appointment) => {
  const phone = normalizeWhatsAppPhone(appointment?.client?.phone);
  if (!phone) return '';

  const appointmentDate = formatWhatsAppDate(appointment.date);
  const clientName = appointment?.client?.firstName ? `${appointment.client.firstName}, ` : '';
  const message = `Hola buen dia ${clientName}hoy ${appointmentDate} tenes turno a las ${appointment.time} en ODONTOLOGIA GARIBALDI. Te esperamos!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

const getLocalDateValue = (value = new Date()) => {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

const createEmptyClientForm = () => ({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  notes: '',
  images: [],
});

const uppercaseValue = (value) => String(value || '').toUpperCase();

const normalizeClientPayload = (form) => ({
  firstName: uppercaseValue(form.firstName),
  lastName: uppercaseValue(form.lastName),
  phone: uppercaseValue(form.phone),
  email: uppercaseValue(form.email),
  notes: uppercaseValue(form.notes),
  images: form.images || [],
});

function App() {
  const [token, setToken] = useState(sessionStorage.getItem('newDentToken') || '');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedModule, setSelectedModule] = useState('agenda');
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientForm, setClientForm] = useState(createEmptyClientForm());
  const [agendaClientForm, setAgendaClientForm] = useState(createEmptyClientForm());
  const [isAgendaClientModalOpen, setIsAgendaClientModalOpen] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({ client: '', date: today.toISOString().split('T')[0], time: '', service: '', notes: '' });
  const [paymentForm, setPaymentForm] = useState({ client: '', date: today.toISOString().split('T')[0], amount: '', description: '', images: [] });
  const [paymentFilter, setPaymentFilter] = useState({ start: '', end: '' });
  const [paymentList, setPaymentList] = useState([]);
  const [selectedClientUpload, setSelectedClientUpload] = useState({ date: getLocalDateValue(), images: [] });
  const [message, setMessage] = useState('');
  const [loadingState, setLoadingState] = useState({ active: false, text: 'Cargando...' });
  const [, setLoadingCount] = useState(0);

  const days = useMemo(() => buildDays(currentMonth), [currentMonth]);
  const monthName = currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  const weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

  const moveMonth = (delta) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  useEffect(() => {
    localStorage.removeItem('newDentToken');
  }, []);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const runWithLoading = async (text, action) => {
    setLoadingState({ active: true, text });
    setLoadingCount((prev) => prev + 1);

    try {
      return await action();
    } finally {
      setLoadingCount((prev) => {
        const next = Math.max(prev - 1, 0);
        if (next === 0) {
          setLoadingState((current) => ({ ...current, active: false }));
        }
        return next;
      });
    }
  };

  const updateClientList = (nextClient) => {
    setClients((prev) =>
      [...prev.filter((client) => client._id !== nextClient._id), nextClient].sort((a, b) => {
        const firstNameCompare = a.firstName.localeCompare(b.firstName);
        if (firstNameCompare !== 0) return firstNameCompare;
        return a.lastName.localeCompare(b.lastName);
      })
    );
  };

  const createClientRecord = async (formData, { loadingText = 'Guardando cliente...' } = {}) => {
    const payload = normalizeClientPayload(formData);

    const result = await fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await result.json();
    if (!result.ok) throw new Error(data.message || 'Error al guardar cliente');

    updateClientList(data);
    return data;
  };

  const fetchClients = async ({ showLoading = true } = {}) => {
    const request = async () => {
      const result = await fetch(`${API_URL}/clients`, { headers });
      const data = await result.json();
      setClients(data);
      return data;
    };

    try {
      return showLoading ? await runWithLoading('Cargando clientes...', request) : await request();
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const fetchAppointments = async (dateParam, { showLoading = true } = {}) => {
    const date = dateParam || selectedDate;
    const iso = date.toISOString().split('T')[0];

    const request = async () => {
      const result = await fetch(`${API_URL}/appointments?date=${iso}`, { headers });
      const data = await result.json();
      setAppointments(data);
      return data;
    };

    try {
      return showLoading ? await runWithLoading('Cargando agenda...', request) : await request();
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const fetchPayments = async (start, end, { showLoading = true } = {}) => {
    const request = async () => {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      const url = `${API_URL}/payments${params.toString() ? `?${params}` : ''}`;
      const result = await fetch(url, { headers });
      const data = await result.json();
      setPaymentList(data);
      return data;
    };

    try {
      return showLoading ? await runWithLoading('Cargando pagos...', request) : await request();
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  useEffect(() => {
    if (token) {
      runWithLoading('Cargando datos...', async () => {
        await Promise.all([
          fetchClients({ showLoading: false }),
          fetchAppointments(undefined, { showLoading: false }),
          fetchPayments(undefined, undefined, { showLoading: false }),
        ]);
      });
    }
  }, [token]);

  const login = async (event) => {
    event.preventDefault();
    await runWithLoading('Ingresando...', async () => {
      try {
        const result = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        const data = await result.json();
        if (!result.ok) throw new Error(data.message || 'Error de login');
        setToken(data.token);
        sessionStorage.setItem('newDentToken', data.token);
        localStorage.removeItem('newDentToken');
        setMessage('Bienvenido a ODONTOLOGIA GARIBALDI');
      } catch (error) {
        setMessage(error.message);
      }
    });
  };

  const logout = () => {
    setToken('');
    sessionStorage.removeItem('newDentToken');
    localStorage.removeItem('newDentToken');
    setClients([]);
    setAppointments([]);
    setSelectedClient(null);
  };

  const saveClient = async (event) => {
    event.preventDefault();
    await runWithLoading('Guardando cliente...', async () => {
      try {
        await createClientRecord(clientForm);
        setClientForm(createEmptyClientForm());
        setMessage('Cliente guardado');
      } catch (error) {
        setMessage(error.message);
      }
    });
  };

  const saveAgendaClient = async (event) => {
    event.preventDefault();
    await runWithLoading('Guardando cliente...', async () => {
      try {
        const createdClient = await createClientRecord(agendaClientForm);
        setAgendaClientForm(createEmptyClientForm());
        setAppointmentForm((prev) => ({ ...prev, client: createdClient._id }));
        setIsAgendaClientModalOpen(false);
        setMessage('Cliente guardado y seleccionado');
      } catch (error) {
        setMessage(error.message);
      }
    });
  };

  const handleClientImages = async (event) => {
    const files = Array.from(event.target.files || []);
    const images = await Promise.all(
      files.map((file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({ url: reader.result, date: new Date().toISOString() });
          };
          reader.readAsDataURL(file);
        })
      )
    );
    setClientForm((prev) => ({ ...prev, images: [...(prev.images || []), ...images] }));
  };

  const handleClientFieldChange = (setter, field) => (event) => {
    const value = event.target.value;
    const nextValue = field === 'phone' ? uppercaseValue(value) : uppercaseValue(value);
    setter((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handlePaymentImages = async (event) => {
    const files = Array.from(event.target.files || []);
    const images = await Promise.all(
      files.map((file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({ url: reader.result, date: new Date().toISOString() });
          };
          reader.readAsDataURL(file);
        })
      )
    );
    setPaymentForm((prev) => ({ ...prev, images: [...(prev.images || []), ...images] }));
  };

  const saveAppointment = async (event) => {
    event.preventDefault();
    await runWithLoading('Guardando turno...', async () => {
      try {
        const result = await fetch(`${API_URL}/appointments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...appointmentForm,
            service: uppercaseValue(appointmentForm.service),
            notes: uppercaseValue(appointmentForm.notes),
          }),
        });
        const data = await result.json();
        if (!result.ok) throw new Error(data.message || 'Error al guardar turno');
        setAppointmentForm({ ...appointmentForm, time: '', service: '', notes: '' });
        await fetchAppointments(new Date(appointmentForm.date), { showLoading: false });
        setMessage('Turno guardado');
      } catch (error) {
        setMessage(error.message);
      }
    });
  };

  const savePayment = async (event) => {
    event.preventDefault();
    await runWithLoading('Guardando pago...', async () => {
      try {
        const body = { ...paymentForm, amount: Number(paymentForm.amount) };
        const result = await fetch(`${API_URL}/payments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...body,
            description: uppercaseValue(paymentForm.description),
          }),
        });
        const data = await result.json();
        if (!result.ok) throw new Error(data.message || 'Error al guardar pago');
        setPaymentForm({ client: '', date: today.toISOString().split('T')[0], amount: '', description: '', images: [] });
        await fetchPayments(paymentFilter.start, paymentFilter.end, { showLoading: false });
        setMessage('Pago guardado');
      } catch (error) {
        setMessage(error.message);
      }
    });
  };

  const loadClientDetails = (client) => {
    setSelectedClient(client);
    setSelectedClientUpload({ date: getLocalDateValue(), images: [] });
    setAppointmentForm((prev) => ({ ...prev, client: client._id }));
    setPaymentForm((prev) => ({ ...prev, client: client._id }));
  };

  const handleSelectedClientImages = async (event) => {
    const files = Array.from(event.target.files || []);
    const images = await Promise.all(
      files.map((file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({ url: reader.result });
          };
          reader.readAsDataURL(file);
        })
      )
    );

    setSelectedClientUpload((prev) => ({ ...prev, images: [...prev.images, ...images] }));
  };

  const saveSelectedClientImages = async (event) => {
    event.preventDefault();

    if (!selectedClient?._id) {
      setMessage('Selecciona un cliente');
      return;
    }

    if (selectedClientUpload.images.length === 0) {
      setMessage('Selecciona al menos una imagen');
      return;
    }

    await runWithLoading('Guardando imágenes...', async () => {
      try {
        const imageDate = selectedClientUpload.date
          ? new Date(`${selectedClientUpload.date}T12:00:00`).toISOString()
          : new Date().toISOString();
        const newImages = selectedClientUpload.images.map((image) => ({
          url: image.url,
          date: imageDate,
        }));

        const result = await fetch(`${API_URL}/clients/${selectedClient._id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            firstName: selectedClient.firstName,
            lastName: selectedClient.lastName,
            phone: selectedClient.phone,
            email: selectedClient.email || '',
            notes: selectedClient.notes || '',
            images: [...(selectedClient.images || []), ...newImages].map((image) => ({
              url: image.url,
              date: image.date,
            })),
          }),
        });
        const data = await result.json();
        if (!result.ok) throw new Error(data.message || 'Error al guardar imágenes');

        setSelectedClient(data);
        setClients((prev) => prev.map((client) => (client._id === data._id ? data : client)));
        setSelectedClientUpload({ date: getLocalDateValue(), images: [] });
        setMessage('Imágenes agregadas');
      } catch (error) {
        setMessage(error.message);
      }
    });
  };

  const exportPayments = async () => {
    if (!paymentFilter.start || !paymentFilter.end) {
      setMessage('Selecciona rango de fechas');
      return;
    }
    await runWithLoading('Exportando pagos...', async () => {
      const url = new URL(`${API_URL}/payments/export`);
      url.searchParams.set('start', paymentFilter.start);
      url.searchParams.set('end', paymentFilter.end);
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        setMessage(data.message || 'Error al exportar');
        return;
      }
      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = 'new-dent-pagos.xlsx';
      link.click();
      URL.revokeObjectURL(fileUrl);
      setMessage('Exportación descargada');
    });
  };

  const clientImages = selectedClient?.images || [];

  if (!token) {
    return (
      <div className="layout login-screen">
        {loadingState.active && <LoadingOverlay text={loadingState.text} />}
        <header className="header auth-header">
          <div className="brand auth-brand">
            <BrandLogo />
            <span>ODONTOLOGIA GARIBALDI</span>
          </div>
        </header>
        <main className="panel centered-panel">
          <h2>Iniciar sesión</h2>
          <form className="form" onSubmit={login}>
            <label>
              Usuario
              <input
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                type="text"
                required
              />
            </label>
            <label>
              Contraseña
              <input
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                type="password"
                required
              />
            </label>
            <button className="button primary" type="submit">Entrar</button>
          </form>
          {message && <div className="message">{message}</div>}
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {loadingState.active && <LoadingOverlay text={loadingState.text} />}
      <header className="topbar">
        <div className="brand-panel">
          <div className="brand-large">
            <BrandLogo />
            <span>ODONTOLOGIA GARIBALDI</span>
          </div>
          <p className="brand-subtitle">Agenda, pacientes y caja en un solo lugar</p>
        </div>

        <div className="top-controls">
          <button className="button logout-button" onClick={logout}>Cerrar sesión</button>
          <nav className="module-nav">
            {modules.map((module) => (
              <button
                key={module.key}
                type="button"
                className={module.key === selectedModule ? 'module-button active' : 'module-button'}
                onClick={() => setSelectedModule(module.key)}
              >
                {module.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="content">
        <div className="top-header">
          <div>
            <h1>{modules.find((mod) => mod.key === selectedModule)?.label}</h1>
          </div>
          <div className="status-card">
            <div className="status-item">
              <span>{clients.length}</span>
              <small>Pacientes</small>
            </div>
            <div className="status-item">
              <span>{appointments.length}</span>
              <small>Turnos</small>
            </div>
          </div>
        </div>

        {selectedModule === 'agenda' && (
          <section className="module-card">
            <div className="module-headline">
              <div>
                <p>Selecciona un día para ver y crear turnos.</p>
              </div>
            </div>
            <div className="agenda-content">
              <div className="calendar">
                <div className="calendar-header">
                  <button className="month-nav" type="button" onClick={() => moveMonth(-1)}>&lt;</button>
                  <span>{monthName}</span>
                  <button className="month-nav" type="button" onClick={() => moveMonth(1)}>&gt;</button>
                </div>
                <div className="calendar-weekday-row">
                  {weekDays.map((weekday) => (
                    <div key={weekday} className="weekday-cell">{weekday}</div>
                  ))}
                </div>
                <div className="calendar-days">
                  {days.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      className={day && day.toDateString() === selectedDate.toDateString() ? 'day selected' : 'day blank'}
                      disabled={!day}
                      onClick={() => {
                        if (!day) return;
                        setSelectedDate(day);
                        fetchAppointments(day);
                      }}
                    >
                      {day ? day.getDate() : ''}
                    </button>
                  ))}
                </div>
              </div>
              <div className="agenda-panel">
                <h4>Turnos del {selectedDate.toLocaleDateString()}</h4>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Celular</th>
                        <th>Hora</th>
                        <th>Servicio</th>
                        <th>WhatsApp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.length > 0 ? (
                        appointments.map((item) => {
                          const whatsappUrl = buildWhatsAppUrl(item);

                          return (
                            <tr key={item._id}>
                              <td>{item.client ? `${item.client.firstName} ${item.client.lastName}` : 'Sin paciente'}</td>
                              <td className="phone-cell">{item.client?.phone || '-'}</td>
                              <td>{item.time}</td>
                              <td>{item.service || '-'}</td>
                              <td className="table-action-cell">
                                {whatsappUrl ? (
                                  <a
                                    className="whatsapp-link"
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Enviar recordatorio por WhatsApp"
                                    aria-label={`Enviar WhatsApp a ${item.client?.firstName || 'paciente'}`}
                                  >
                                    <WhatsAppIcon />
                                  </a>
                                ) : (
                                  <span className="whatsapp-link disabled" title="El paciente no tiene celular cargado">
                                    <WhatsAppIcon />
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5">No hay turnos para este día</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="form-section">
                  <h4>Crear turno</h4>
                  <form className="form" onSubmit={saveAppointment}>
                    <label>
                      Paciente
                      <select
                        value={appointmentForm.client}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, client: e.target.value })}
                        required
                      >
                        <option value="">Seleccionar paciente</option>
                        {clients.map((client) => (
                          <option key={client._id} value={client._id}>
                            {client.firstName} {client.lastName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setIsAgendaClientModalOpen(true)}
                    >
                      Paciente no existe
                    </button>
                    <label>
                      Fecha
                      <input
                        type="date"
                        value={appointmentForm.date}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                        required
                      />
                    </label>
                    <label>
                      Hora
                      <input
                        type="time"
                        value={appointmentForm.time}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })}
                        required
                      />
                    </label>
                    <label>
                      Servicio
                      <input
                        value={appointmentForm.service}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, service: uppercaseValue(e.target.value) })}
                      />
                    </label>
                    <label>
                      Notas
                      <textarea
                        value={appointmentForm.notes}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: uppercaseValue(e.target.value) })}
                      />
                    </label>
                    <button className="button primary" type="submit">Guardar turno</button>
                  </form>
                </div>
              </div>
            </div>
          </section>
        )}

        {selectedModule === 'clientes' && (
          <section className="module-card">
            <div className="module-headline">
              <div>
                <p>Administrá la lista de pacientes y sus imágenes de tratamientos.</p>
              </div>
            </div>
            <div className="clients-content">
              <div className="form-section">
                <h4>Nuevo paciente</h4>
                <form className="form" onSubmit={saveClient}>
                  <label>
                    Nombre
                    <input
                      value={clientForm.firstName}
                      onChange={handleClientFieldChange(setClientForm, 'firstName')}
                      required
                    />
                  </label>
                  <label>
                    Apellido
                    <input
                      value={clientForm.lastName}
                      onChange={handleClientFieldChange(setClientForm, 'lastName')}
                      required
                    />
                  </label>
                  <label>
                    Teléfono
                    <input
                      value={clientForm.phone}
                      onChange={handleClientFieldChange(setClientForm, 'phone')}
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input
                      value={clientForm.email}
                      onChange={handleClientFieldChange(setClientForm, 'email')}
                    />
                  </label>
                  <label>
                    Notas
                    <textarea
                      value={clientForm.notes}
                      onChange={handleClientFieldChange(setClientForm, 'notes')}
                    />
                  </label>
                  <label>
                    Imágenes del paciente
                    <input type="file" accept="image/*" capture="environment" multiple onChange={handleClientImages} />
                  </label>
                  <div className="image-preview-row">
                    {clientForm.images.length > 0 ? (
                      clientForm.images.map((image, index) => (
                        <div className="image-preview" key={index}>
                          <img src={image.url} alt={`Preview ${index + 1}`} />
                          <span>{formatDate(image.date)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="small-note">No hay imágenes cargadas aún</p>
                    )}
                  </div>
                  <button className="button primary" type="submit">Guardar paciente</button>
                </form>
              </div>
              <div className="clients-list-section">
                <h4>Lista de pacientes</h4>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Teléfono</th>
                        <th>Ver</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr key={client._id}>
                          <td>{client.firstName} {client.lastName}</td>
                          <td>{client.phone}</td>
                          <td>
                            <button className="button small" type="button" onClick={() => loadClientDetails(client)}>
                              Abrir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {selectedClient && (
                <div className="client-card-large">
                  <h4>{selectedClient.firstName} {selectedClient.lastName}</h4>
                  <p><strong>Teléfono:</strong> {selectedClient.phone}</p>
                  <p><strong>Email:</strong> {selectedClient.email || 'No registrado'}</p>
                  <p><strong>Notas:</strong> {selectedClient.notes || 'Sin notas'}</p>
                  <div className="client-upload-panel">
                    <h5>Agregar imágenes</h5>
                    <form className="form" onSubmit={saveSelectedClientImages}>
                      <label>
                        Fecha
                        <input
                          type="date"
                          value={selectedClientUpload.date}
                          onChange={(e) => setSelectedClientUpload((prev) => ({ ...prev, date: e.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        Imágenes
                        <input type="file" accept="image/*" capture="environment" multiple onChange={handleSelectedClientImages} />
                      </label>
                      <div className="image-preview-row">
                        {selectedClientUpload.images.length > 0 ? (
                          selectedClientUpload.images.map((image, index) => (
                            <div className="image-preview" key={index}>
                              <img src={image.url} alt={`Nueva imagen ${index + 1}`} />
                              <span>{formatDate(selectedClientUpload.date)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="small-note">Todavía no seleccionaste imágenes nuevas</p>
                        )}
                      </div>
                      <button className="button primary" type="submit">Guardar imágenes</button>
                    </form>
                  </div>
                  <div className="images-grid">
                    {clientImages.length > 0 ? (
                      clientImages.map((image, index) => (
                        <div className="image-card" key={index}>
                          <img src={image.url} alt={`Trabajo ${index + 1}`} />
                          <p>{formatDate(image.date)}</p>
                        </div>
                      ))
                    ) : (
                      <p>Sin imágenes cargadas</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {selectedModule === 'caja' && (
          <section className="module-card">
            <div className="module-headline">
              <div>
                <p>Registrá pagos, subí imágenes del trabajo y exportá el detalle en Excel.</p>
              </div>
            </div>
            <div className="caja-content">
              <div className="form-section">
                <h4>Registrar pago</h4>
                <form className="form" onSubmit={savePayment}>
                  <label>
                    Paciente
                    <select
                      value={paymentForm.client}
                      onChange={(e) => setPaymentForm({ ...paymentForm, client: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar paciente</option>
                      {clients.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.firstName} {client.lastName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Fecha
                    <input
                      type="date"
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Monto
                    <input
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      type="number"
                      required
                    />
                  </label>
                  <label>
                    Descripción
                    <input
                      value={paymentForm.description}
                      onChange={(e) => setPaymentForm({ ...paymentForm, description: uppercaseValue(e.target.value) })}
                    />
                  </label>
                  <label>
                    Imágenes del trabajo
                    <input type="file" accept="image/*" capture="environment" multiple onChange={handlePaymentImages} />
                  </label>
                  <div className="image-preview-row">
                    {paymentForm.images.length > 0 ? (
                      paymentForm.images.map((image, index) => (
                        <div className="image-preview" key={index}>
                          <img src={image.url} alt={`Preview ${index + 1}`} />
                          <span>{formatDate(image.date)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="small-note">Subí hasta 2 imágenes del trabajo del día</p>
                    )}
                  </div>
                  <button className="button primary" type="submit">Guardar pago</button>
                </form>
              </div>
              <div className="payments-panel">
                <h4>Exportar pagos</h4>
                <div className="form" style={{ gap: '10px' }}>
                  <label>
                    Desde
                    <input
                      type="date"
                      value={paymentFilter.start}
                      onChange={(e) => setPaymentFilter({ ...paymentFilter, start: e.target.value })}
                    />
                  </label>
                  <label>
                    Hasta
                    <input
                      type="date"
                      value={paymentFilter.end}
                      onChange={(e) => setPaymentFilter({ ...paymentFilter, end: e.target.value })}
                    />
                  </label>
                  <button className="button primary" type="button" onClick={exportPayments}>Exportar Excel</button>
                </div>
                <div className="table-scroll">
                  {paymentList.length > 0 ? (
                    <table className="fullwidth">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Cliente</th>
                          <th>Monto</th>
                          <th>Imágenes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentList.map((item) => (
                          <tr key={item._id}>
                            <td>{new Date(item.date).toLocaleDateString()}</td>
                            <td>{item.client?.firstName} {item.client?.lastName}</td>
                            <td>${item.amount}</td>
                            <td>{item.images?.length || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No hay pagos en este rango</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {message && <div className="toast">{message}</div>}
      </main>

      {isAgendaClientModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAgendaClientModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3>Nuevo paciente</h3>
              <button
                className="button secondary small"
                type="button"
                onClick={() => {
                  setAgendaClientForm(createEmptyClientForm());
                  setIsAgendaClientModalOpen(false);
                }}
              >
                Cerrar
              </button>
            </div>
            <form className="form" onSubmit={saveAgendaClient}>
              <label>
                Nombre
                <input
                  value={agendaClientForm.firstName}
                  onChange={handleClientFieldChange(setAgendaClientForm, 'firstName')}
                  required
                />
              </label>
              <label>
                Apellido
                <input
                  value={agendaClientForm.lastName}
                  onChange={handleClientFieldChange(setAgendaClientForm, 'lastName')}
                  required
                />
              </label>
              <label>
                Teléfono
                <input
                  value={agendaClientForm.phone}
                  onChange={handleClientFieldChange(setAgendaClientForm, 'phone')}
                  required
                />
              </label>
              <label>
                Email
                <input
                  value={agendaClientForm.email}
                  onChange={handleClientFieldChange(setAgendaClientForm, 'email')}
                />
              </label>
              <label>
                Notas
                <textarea
                  value={agendaClientForm.notes}
                  onChange={handleClientFieldChange(setAgendaClientForm, 'notes')}
                />
              </label>
              <button className="button primary" type="submit">Guardar paciente</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
