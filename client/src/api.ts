const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type User = {
  id: string;
  username: string;
  email: string;
  name: string;
  phone: string | null;
  major: string | null;
  interestedCount: number;
};

export type Book = {
  id: string;
  isbn: string;
  title: string;
  author: string;
  subject: string | null;
  description: string | null;
  originalPrice: string | null;
  askingPrice: string | null;
  imageUrl: string | null;
  status: string;
  createdAt?: string;
  owner: User;
  interestCount?: number;
};

export type LoginResponse = {
  user: User;
  token: string;
};

export type BookPayload = {
  isbn: string;
  title: string;
  author: string;
  subject?: string;
  description?: string;
  originalPrice?: string;
  askingPrice?: string;
  imageUrl?: string;
  status?: string;
};

export type NotificationItem = {
  id: string;
  createdAt: string;
  user: User;
  book: {
    id: string;
    title: string;
    isbn: string;
  };
};

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Request failed.' }));
    throw new Error(errorBody.error || 'Request failed.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  register(payload: {
    username: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
    major?: string;
  }) {
    return request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  books(params: { type?: string; value?: string; q?: string } = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        search.set(key, value);
      }
    });

    return request<Book[]>(`/books${search.toString() ? `?${search.toString()}` : ''}`);
  },

  book(id: string) {
    return request<Book>(`/books/${id}`);
  },

  createBook(payload: BookPayload, token: string) {
    return request<Book>('/books', {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
    });
  },

  updateBook(id: string, payload: BookPayload, token: string) {
    return request<Book>(`/books/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    });
  },

  deleteBook(id: string, token: string) {
    return request<void>(`/books/${id}`, {
      method: 'DELETE',
      token
    });
  },

  interested(id: string, token: string) {
    return request<{ book: Book; owner: User }>(`/books/${id}/interests`, {
      method: 'POST',
      token
    });
  },

  removeInterest(id: string, token: string) {
    return request<void>(`/books/${id}/interests`, {
      method: 'DELETE',
      token
    });
  },

  profile(token: string) {
    return request<User>('/me/profile', { token });
  },

  updateProfile(payload: Partial<Pick<User, 'name' | 'phone' | 'major'>> & { password?: string }, token: string) {
    return request<User>('/me/profile', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    });
  },

  myBooks(token: string) {
    return request<Book[]>('/me/books', { token });
  },

  myInterests(token: string) {
    return request<Book[]>('/me/interests', { token });
  },

  notifications(token: string) {
    return request<NotificationItem[]>('/me/notifications', { token });
  },

  markNotificationsRead(token: string) {
    return request<User>('/me/notifications/read', {
      method: 'POST',
      token
    });
  }
};
