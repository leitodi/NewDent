import { useEffect, useMemo, useState } from 'react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const today = new Date();

const buildDays = () => {
  const days = [];
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  for (let i = 1; i <= lastDay.getDate(); i += 1) {
    days.push(new Date(year, month, i));
  }
  return days;
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('newDentToken') || '');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientForm, setClientForm] = useState({ firstName: '', lastName: '', phone: '', email: '', notes: '' });
  const [appointmentForm, setAppointmentForm] = useState({ client: '', date: today.toISOString().split('T')[0], time: '', service: '', notes: '' });
  const [paymentForm, setPaymentForm] = useState({ client: '', date: today.toISOString().split('T')[0], amount: '', description: '' });
  const [paymentFilter, setPaymentFilter] = useState({ start: '', end: '' });
  const [paymentList, setPaymentList] = useState([]);
  const [message, setMessage] = useState('');

  const days = useMemo(buildDays, []);

  useEffect(() => {
    if (token) {
      fetchClients();
      fetchAppointments();
      fetchPayments();
    }
  }, [token]);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const login = async (event) => {
    event.preventDefault();
    try {
      const result = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.message || 'Error de login');
      setToken(data.token);
      localStorage.setItem('newDentToken', data.token);
      setMessage('Bienvenido a NEW DENT');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const logout = () => {
    setToken('');
    localStorage.removeItem('newDentToken');
    setClients([]);
    setAppointments([]);
    setSelectedClient(null);
  };

  const fetchClients = async () => {
    try {
      const result = await fetch(`${API_URL}/clients`, { headers });
      const data = await result.json();
      setClients(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAppointments = async (dateParam) => {
    const date = dateParam || selectedDate;
    const iso = date.toISOString().split('T')[0];
    try {
      const result = await fetch(`${API_URL}/appointments?date=${iso}`, { headers });
      const data = await result.json();
      setAppointments(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPayments = async (start, end) => {
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      const url = `${API_URL}/payments${params.toString() ? `?${params}` : ''}`;
      const result = await fetch(url, { headers });
      const data = await result.json();
      setPaymentList(data);
    } catch (error) {
      console.error(error);
    }
  };

  const saveAppointment = async (event) => {
    event.preventDefault();
    try {
      const result = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(appointmentForm),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.message || 'Error al guardar turno');
      setAppointmentForm({ client: '', date: today.toISOString().split('T')[0], time: '', service: '', notes: '' });
      fetchAppointments(new Date(appointmentForm.date));
      setMessage('Turno guardado');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const savePayment = async (event) => {
    event.preventDefault();
    try {
      const body = { ...paymentForm, amount: Number(paymentForm.amount) };
      const result = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.message || 'Error al guardar pago');
      setPaymentForm({ client: '', date: today.toISOString().split('T')[0], amount: '', description: '' });
      fetchPayments(paymentFilter.start, paymentFilter.end);
      setMessage('Pago guardado');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const loadClientDetails = async (client) => {
    setSelectedClient(client);
    setAppointmentForm((prev) => ({ ...prev, client: client._id }));
    setPaymentForm((prev) => ({ ...prev, client: client._id }));
  };

  const saveClient = async (event) => {
    event.preventDefault();
    try {
      const result = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers,
        body: JSON.stringify(clientForm),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.message || 'Error al guardar cliente');
      setClientForm({ firstName: '', lastName: '', phone: '', email: '', notes: '' });
      fetchClients();
      setMessage('Cliente guardado');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const loadClientDetails = async (client) => {
    setSelectedClient(client);
  };

  const exportPayments = async () => {
    if (!paymentFilter.start || !paymentFilter.end) {
      setMessage('Selecciona rango de fechas');
      return;
    }
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
  };

  if (!token) {
    return (
      <div className="layout">
        <header className="header">
          <div className="brand">NEW DENT</div>
          <p>Agenda de turnos para clínica dental</p>
        </header>
        <main className="panel">
          <h2>Iniciar sesión</h2>
          <form className="form" onSubmit={login}>
            <label>
              Email
              <input
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                type="email"
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
    <div className="layout">
      <header className="header">
        <div>
          <div className="brand">NEW DENT</div>
          <p>Agenda de turnos y caja</p>
        </div>
        <button className="button secondary" onClick={logout}>Cerrar sesión</button>
      </header>

      <main className="grid">
        <section className="card">
          <h3>Calendario</h3>
          <div className="calendar">
            {days.map((day) => (
              <button
                key={day.toISOString()}
                type="button"
                className={day.getDate() === selectedDate.getDate() ? 'day selected' : 'day'}
                onClick={() => {
                  setSelectedDate(day);
                  fetchAppointments(day);
                }}
              >
                {day.getDate()}
              </button>
            ))}
          </div>
          <div>
            <h4>Turnos del {selectedDate.toLocaleDateString()}</h4>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length > 0 ? (
                  appointments.map((item) => (
                    <tr key={item._id}>
                      <td>{item.client ? `${item.client.firstName} ${item.client.lastName}` : 'Sin cliente'}</td>
                      <td>{item.time}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2">No hay turnos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3>Clientes</h3>
          <table className="fullwidth">
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
          {selectedClient && (
            <div className="client-card">
              <h4>Detalles de {selectedClient.firstName} {selectedClient.lastName}</h4>
              <p>Teléfono: {selectedClient.phone}</p>
              <p>Email: {selectedClient.email || 'No registrado'}</p>
              <p>Notas: {selectedClient.notes || 'Sin notas'}</p>
              <div className="images-grid">
                {selectedClient.images && selectedClient.images.length > 0 ? (
                  selectedClient.images.map((src, index) => (
                    <img key={index} src={src} alt={`Trabajo ${index + 1}`} />
                  ))
                ) : (
                  <p>Sin imágenes cargadas</p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <h3>Agregar cliente</h3>
          <form className="form" onSubmit={saveClient}>
            <label>
              Nombre
              <input
                value={clientForm.firstName}
                onChange={(e) => setClientForm({ ...clientForm, firstName: e.target.value })}
                required
              />
            </label>
            <label>
              Apellido
              <input
                value={clientForm.lastName}
                onChange={(e) => setClientForm({ ...clientForm, lastName: e.target.value })}
                required
              />
            </label>
            <label>
              Teléfono
              <input
                value={clientForm.phone}
                onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                required
              />
            </label>
            <label>
              Email
              <input
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
              />
            </label>
            <label>
              Notas
              <textarea
                value={clientForm.notes}
                onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
              />
            </label>
            <button className="button primary" type="submit">Guardar cliente</button>
          </form>
        </section>

        <section className="card">
          <h3>Caja y exportación</h3>
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
          {paymentList.length > 0 && (
            <table className="fullwidth">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {paymentList.map((item) => (
                  <tr key={item._id}>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    <td>{item.client?.firstName} {item.client?.lastName}</td>
                    <td>${item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
      {message && <div className="toast">{message}</div>}
    </div>
  );
}

export default App;
