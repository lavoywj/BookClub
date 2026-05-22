import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Check,
  Edit3,
  Heart,
  LogIn,
  LogOut,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  UserPlus,
  X
} from 'lucide-react';
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { api, Book, BookPayload, NotificationItem, User } from './api';
import { AuthProvider, useAuth } from './auth';

const emptyBookForm: BookPayload = {
  isbn: '',
  title: '',
  author: '',
  subject: '',
  description: '',
  originalPrice: '',
  askingPrice: '',
  imageUrl: ''
};

function money(value: string | null | undefined) {
  if (!value) {
    return 'Not listed';
  }
  return `$${Number(value).toFixed(2)}`;
}

function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const auth = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <BookOpen size={24} />
          <span>BookClub</span>
        </Link>
        <nav className="nav-links">
          <NavLink to="/">Browse</NavLink>
          {auth.isAuthenticated && <NavLink to="/dashboard">Dashboard</NavLink>}
          {auth.isAuthenticated && <NavLink to="/new">Sell a Book</NavLink>}
        </nav>
        <div className="account-actions">
          {auth.isAuthenticated ? (
            <>
              <span className="account-name">{auth.user?.name}</span>
              <button className="icon-button" type="button" onClick={auth.logout} aria-label="Log out" title="Log out">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link className="button compact" to="/login">
              <LogIn size={17} />
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/books/:id" element={<BookDetailPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/new" element={<RequireAuth><BookFormPage /></RequireAuth>} />
          <Route path="/edit/:id" element={<RequireAuth><BookFormPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const auth = useAuth();
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function BrowsePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadBooks(params: { type?: string; value?: string } = {}) {
    setLoading(true);
    setError('');
    try {
      setBooks(await api.books(params));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load books.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBooks();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    loadBooks(query.trim() ? { type, value: query.trim() } : {});
  }

  return (
    <section className="page-grid">
      <div className="page-heading">
        <p className="eyebrow">Campus textbook exchange</p>
        <h1>Find the books you need without paying bookstore prices.</h1>
      </div>

      <form className="search-panel" onSubmit={submit}>
        <label>
          <span>Search</span>
          <div className="search-input">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, author, ISBN, or subject" />
          </div>
        </label>
        <label>
          <span>Filter</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">All fields</option>
            <option value="Title">Title</option>
            <option value="Author">Author</option>
            <option value="ISBN">ISBN</option>
          </select>
        </label>
        <button className="button" type="submit">
          <Search size={18} />
          Search
        </button>
      </form>

      {error && <Status tone="error" message={error} />}
      {loading && <Status message="Loading books..." />}
      {!loading && !books.length && <Status message="No books match that search." />}
      <div className="book-grid">
        {books.map((book) => <BookCard key={book.id} book={book} />)}
      </div>
    </section>
  );
}

function BookCard({ book }: { book: Book }) {
  return (
    <article className="book-card">
      <Link to={`/books/${book.id}`} className="cover-link">
        {book.imageUrl ? <img src={book.imageUrl} alt={`${book.title} cover`} /> : <BookOpen size={42} />}
      </Link>
      <div className="book-card-body">
        <p className="book-subject">{book.subject || 'General'}</p>
        <h2><Link to={`/books/${book.id}`}>{book.title}</Link></h2>
        <p className="muted">{book.author}</p>
        <div className="book-meta">
          <span>{money(book.askingPrice)}</span>
          <span>{book.owner.name}</span>
        </div>
      </div>
    </article>
  );
}

function BookDetailPage() {
  const { id } = useParams();
  const auth = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }
    api.book(id)
      .then(setBook)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load book.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function markInterested() {
    if (!auth.token || !id) {
      setError('Sign in to contact the owner.');
      return;
    }
    if (book?.owner.username === auth.user?.username) {
      setError('This is one of your listings.');
      return;
    }
    setError('');
    const response = await api.interested(id, auth.token);
    setOwner(response.owner);
    setMessage('Added to your interested books.');
  }

  if (loading) {
    return <Status message="Loading book..." />;
  }
  if (!book) {
    return <Status tone="error" message={error || 'Book not found.'} />;
  }

  return (
    <section className="detail-layout">
      <div className="detail-cover">
        {book.imageUrl ? <img src={book.imageUrl} alt={`${book.title} cover`} /> : <BookOpen size={64} />}
      </div>
      <div className="detail-main">
        <p className="eyebrow">{book.subject || 'Textbook'}</p>
        <h1>{book.title}</h1>
        <p className="byline">by {book.author}</p>
        <div className="price-row">
          <div>
            <span>Asking price</span>
            <strong>{money(book.askingPrice)}</strong>
          </div>
          <div>
            <span>Original price</span>
            <strong>{money(book.originalPrice)}</strong>
          </div>
          <div>
            <span>ISBN</span>
            <strong>{book.isbn}</strong>
          </div>
        </div>
        <p className="description">{book.description || 'No description provided.'}</p>
        {message && <Status tone="success" message={message} />}
        {error && <Status tone="error" message={error} />}
        {owner && (
          <div className="owner-panel">
            <h2>Owner contact</h2>
            <p>{owner.name}</p>
            <p>{owner.email}</p>
            {owner.phone && <p>{owner.phone}</p>}
          </div>
        )}
        <div className="action-row">
          <button className="button" type="button" onClick={markInterested}>
            <Heart size={18} />
            I'm interested
          </button>
          <Link className="button secondary" to="/">
            <X size={18} />
            Back
          </Link>
        </div>
      </div>
    </section>
  );
}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    phone: '',
    major: ''
  });
  const [error, setError] = useState('');
  const isRegister = mode === 'register';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await auth.register(form);
      } else {
        await auth.login(form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    }
  }

  return (
    <section className="auth-layout">
      <form className="panel form-panel" onSubmit={submit}>
        <div className="section-title">
          {isRegister ? <UserPlus size={22} /> : <LogIn size={22} />}
          <h1>{isRegister ? 'Create account' : 'Welcome back'}</h1>
        </div>
        {isRegister && (
          <>
            <TextField label="Username" value={form.username} onChange={(value) => setForm({ ...form, username: value })} required />
            <TextField label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            <TextField label="Major" value={form.major} onChange={(value) => setForm({ ...form, major: value })} />
            <TextField label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
          </>
        )}
        <TextField label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
        <TextField label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} required />
        {error && <Status tone="error" message={error} />}
        <button className="button" type="submit">
          {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
          {isRegister ? 'Create account' : 'Sign in'}
        </button>
        <p className="muted">
          {isRegister ? 'Already have an account?' : 'Need an account?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Register'}</Link>
        </p>
      </form>
    </section>
  );
}

function DashboardPage() {
  const auth = useAuth();
  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [interests, setInterests] = useState<Book[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [profile, setProfile] = useState({
    name: auth.user?.name || '',
    major: auth.user?.major || '',
    phone: auth.user?.phone || ''
  });
  const [message, setMessage] = useState('');
  const token = auth.token!;

  async function refresh() {
    const [books, saved, notes, currentUser] = await Promise.all([
      api.myBooks(token),
      api.myInterests(token),
      api.notifications(token),
      api.profile(token)
    ]);
    setMyBooks(books);
    setInterests(saved);
    setNotifications(notes);
    auth.setUser(currentUser);
    setProfile({
      name: currentUser.name || '',
      major: currentUser.major || '',
      phone: currentUser.phone || ''
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function deleteBook(id: string) {
    await api.deleteBook(id, token);
    refresh();
  }

  async function removeInterest(id: string) {
    await api.removeInterest(id, token);
    refresh();
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const user = await api.updateProfile(profile, token);
    auth.setUser(user);
    setMessage('Profile updated.');
  }

  return (
    <section className="dashboard">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Member dashboard</p>
          <h1>{auth.user?.name}</h1>
        </div>
        <Link className="button" to="/new">
          <Plus size={18} />
          Add listing
        </Link>
      </div>

      <div className="stats-row">
        <Stat label="My listings" value={myBooks.length} />
        <Stat label="Interested books" value={interests.length} />
        <Stat label="New contacts" value={notifications.length} />
      </div>

      <section className="dashboard-section">
        <div className="section-title">
          <Bell size={22} />
          <h2>People interested in your books</h2>
        </div>
        <div className="list">
          {notifications.length ? notifications.map((item) => (
            <div className="list-row" key={item.id}>
              <div>
                <strong>{item.user.name}</strong>
                <span>{item.book.title}</span>
              </div>
              <a href={`mailto:${item.user.email}`} className="button compact secondary">Email</a>
            </div>
          )) : <p className="muted">No one has reached out yet.</p>}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <BookOpen size={22} />
          <h2>My listings</h2>
        </div>
        <div className="list">
          {myBooks.map((book) => (
            <div className="list-row" key={book.id}>
              <div>
                <strong>{book.title}</strong>
                <span>{book.author} · {money(book.askingPrice)}</span>
              </div>
              <div className="row-actions">
                <Link className="icon-button" to={`/edit/${book.id}`} aria-label="Edit listing" title="Edit listing">
                  <Edit3 size={17} />
                </Link>
                <button className="icon-button danger" type="button" onClick={() => deleteBook(book.id)} aria-label="Delete listing" title="Delete listing">
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <Heart size={22} />
          <h2>Books I'm interested in</h2>
        </div>
        <div className="list">
          {interests.map((book) => (
            <div className="list-row" key={book.id}>
              <div>
                <strong>{book.title}</strong>
                <span>{book.owner.name} · {money(book.askingPrice)}</span>
              </div>
              <button className="icon-button danger" type="button" onClick={() => removeInterest(book.id)} aria-label="Remove interest" title="Remove interest">
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-title">
          <Settings size={22} />
          <h2>Profile</h2>
        </div>
        <form className="profile-grid" onSubmit={saveProfile}>
          <TextField label="Name" value={profile.name} onChange={(value) => setProfile({ ...profile, name: value })} required />
          <TextField label="Major" value={profile.major || ''} onChange={(value) => setProfile({ ...profile, major: value })} />
          <TextField label="Phone" value={profile.phone || ''} onChange={(value) => setProfile({ ...profile, phone: value })} />
          <button className="button" type="submit">
            <Save size={18} />
            Save profile
          </button>
        </form>
        {message && <Status tone="success" message={message} />}
      </section>
    </section>
  );
}

function BookFormPage() {
  const { id } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<BookPayload>(emptyBookForm);
  const [error, setError] = useState('');
  const editing = Boolean(id);

  useEffect(() => {
    if (!id) {
      return;
    }
    api.book(id).then((book) => setForm({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      subject: book.subject || '',
      description: book.description || '',
      originalPrice: book.originalPrice || '',
      askingPrice: book.askingPrice || '',
      imageUrl: book.imageUrl || '',
      status: book.status
    }));
  }, [id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (editing && id) {
        await api.updateBook(id, form, auth.token!);
      } else {
        await api.createBook(form, auth.token!);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save listing.');
    }
  }

  return (
    <section className="form-layout">
      <form className="panel form-panel wide" onSubmit={submit}>
        <div className="section-title">
          {editing ? <Edit3 size={22} /> : <Plus size={22} />}
          <h1>{editing ? 'Edit listing' : 'Add a textbook'}</h1>
        </div>
        <div className="form-grid">
          <TextField label="ISBN" value={form.isbn || ''} onChange={(value) => setForm({ ...form, isbn: value })} required />
          <TextField label="Title" value={form.title || ''} onChange={(value) => setForm({ ...form, title: value })} required />
          <TextField label="Author" value={form.author || ''} onChange={(value) => setForm({ ...form, author: value })} required />
          <TextField label="Subject" value={form.subject || ''} onChange={(value) => setForm({ ...form, subject: value })} />
          <TextField label="Original price" value={form.originalPrice || ''} onChange={(value) => setForm({ ...form, originalPrice: value })} />
          <TextField label="Asking price" value={form.askingPrice || ''} onChange={(value) => setForm({ ...form, askingPrice: value })} />
        </div>
        <TextField label="Image URL" value={form.imageUrl || ''} onChange={(value) => setForm({ ...form, imageUrl: value })} />
        <label className="field">
          <span>Description</span>
          <textarea value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={5} />
        </label>
        {error && <Status tone="error" message={error} />}
        <button className="button" type="submit">
          <Check size={18} />
          Save listing
        </button>
      </form>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required = false
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Status({ message, tone = 'neutral' }: { message: string; tone?: 'neutral' | 'error' | 'success' }) {
  return <div className={`status ${tone}`}>{message}</div>;
}

export default App;
