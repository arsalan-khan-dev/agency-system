'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { User } from '@/lib/types';

const C = {
  surface: 'var(--surface, #10151d)', elevated: 'var(--surface-elevated, #161c26)', border: 'var(--border, #232b38)',
  primary: 'var(--primary, #3aa0ff)', secondary: 'var(--secondary, #8b7cf6)', success: 'var(--success, #34c78e)',
  warning: 'var(--warning, #e8b34d)', danger: 'var(--danger, #e5566a)', text: 'var(--text, #eef2f7)', muted: 'var(--text-muted, #8894a6)',
};

// ─── Icons ───────────────────────────────────────────────────────────
const IcUsers = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IcUserPlus = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);
const IcShield = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IcKey = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);
const IcEdit = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IcTrash = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);
const IcCheck = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ROLE_NAMES = ['admin', 'manager', 'estimator', 'viewer'] as const;

interface CreateFormState { email: string; fullName: string; password: string; roleName: (typeof ROLE_NAMES)[number]; }
const EMPTY_CREATE_FORM: CreateFormState = { email: '', fullName: '', password: '', roleName: 'viewer' };
interface EditFormState { fullName: string; roleName: (typeof ROLE_NAMES)[number]; }

export default function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ fullName: '', roleName: 'viewer' });
  const [editError, setEditError] = useState<string | null>(null);

  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});

  function load() {
    setError(null);
    Promise.all([api.get<User[]>('/api/v1/users'), api.get<{ id: string }>('/api/v1/auth/me')])
      .then(([u, me]) => { setUsers(u); setCurrentUserId(me.id); })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load users.'));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault(); setCreateError(null); setSaving(true);
    try {
      await api.post('/api/v1/users', createForm);
      setCreating(false); setCreateForm(EMPTY_CREATE_FORM); load();
    } catch (err) { setCreateError(err instanceof ApiError ? err.message : 'Could not create this user.'); }
    finally { setSaving(false); }
  }

  function startEdit(u: User) {
    setEditForm({ fullName: u.fullName, roleName: u.role.name });
    setEditError(null); setEditingId(u.id); setResettingId(null);
  }

  async function handleEditSave(e: FormEvent, id: string) {
    e.preventDefault(); setEditError(null); setSaving(true);
    try { await api.patch(`/api/v1/users/${id}`, editForm); setEditingId(null); load(); }
    catch (err) { setEditError(err instanceof ApiError ? err.message : 'Could not save this user.'); }
    finally { setSaving(false); }
  }

  async function toggleActive(u: User) {
    try { await api.patch(`/api/v1/users/${u.id}`, { isActive: !u.isActive }); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Could not change this user\u2019s status.'); }
  }

  function startReset(id: string) {
    setResettingId(id); setNewPassword(''); setResetError(null); setResetSuccess(false); setEditingId(null);
  }

  async function handleResetSave(e: FormEvent, id: string) {
    e.preventDefault(); setResetError(null); setSaving(true);
    try {
      await api.patch(`/api/v1/users/${id}/password`, { newPassword });
      setResetSuccess(true); setNewPassword('');
    } catch (err) { setResetError(err instanceof ApiError ? err.message : 'Could not reset this password.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setDeleteError((prev) => ({ ...prev, [id]: '' }));
    try { await api.delete(`/api/v1/users/${id}`); setConfirmingDeleteId(null); load(); }
    catch (err) { setDeleteError((prev) => ({ ...prev, [id]: err instanceof ApiError ? err.message : 'Could not delete this user.', })); }
  }

  const roleColors: Record<string, string> = { admin: C.danger, manager: C.warning, estimator: C.primary, viewer: C.muted };

  return (
    <AppShell active="/users">
      <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, background: `${C.primary}18`, border: `1px solid ${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
              <IcUsers />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Users & Permissions</h1>
              <p style={{ fontSize: 13, color: C.muted, margin: 0, maxWidth: 500 }}>
                Manage staff access and roles. Passwords can be reset here directly (no email link is sent).
              </p>
            </div>
          </div>
          {!creating && (
            <button onClick={() => setCreating(true)} style={{
              padding: '10px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${C.primary}, #2280d0)`,
              color: '#fff', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(58,160,255,0.3)',
            }}>
              <IcUserPlus /> New User
            </button>
          )}
        </div>

        {error && <div style={{ padding: '14px 18px', background: `${C.danger}12`, border: `1px solid ${C.danger}44`, borderRadius: 10, color: C.danger, fontSize: 13, marginBottom: 24 }}>{error}</div>}

        {/* Create Form */}
        {creating && (
          <div style={{ background: C.surface, border: `1px solid ${C.primary}44`, borderRadius: 14, padding: '28px', marginBottom: 24, boxShadow: `0 0 40px ${C.primary}11` }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 20px' }}>Create New User</h2>
            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Full Name *
                <input required value={createForm.fullName} onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })} placeholder="e.g. John Doe" style={{ padding: '12px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email Address *
                <input required type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="e.g. john@agency.com" style={{ padding: '12px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Temporary Password *
                <input required type="password" minLength={8} value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Min 8 characters" style={{ padding: '12px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                System Role *
                <select value={createForm.roleName} onChange={e => setCreateForm({ ...createForm, roleName: e.target.value as CreateFormState['roleName'] })} style={{ padding: '12px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}>
                  {ROLE_NAMES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </label>
              
              {createError && <div style={{ gridColumn: '1 / -1', padding: '10px', background: `${C.danger}12`, border: `1px solid ${C.danger}44`, borderRadius: 8, color: C.danger, fontSize: 13 }}>{createError}</div>}
              
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, marginTop: 4 }}>
                <button type="submit" disabled={saving} style={{ padding: '11px 24px', borderRadius: 9, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? C.elevated : `linear-gradient(135deg, ${C.primary}, #2280d0)`, color: saving ? C.muted : '#fff', fontSize: 13, fontWeight: 600, boxShadow: saving ? 'none' : '0 4px 14px rgba(58,160,255,0.3)' }}>
                  {saving ? 'Creating…' : 'Create User'}
                </button>
                <button type="button" onClick={() => setCreating(false)} disabled={saving} style={{ padding: '11px 24px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        {users === null && !error ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.muted, fontSize: 13 }}>Loading users…</div>
        ) : users && users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, border: `1px dashed ${C.border}`, borderRadius: 14, color: C.muted }}>No users found.</div>
        ) : (
          users && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {users.map(u => {
                const isSelf = u.id === currentUserId;
                const rColor = roleColors[u.role.name] || C.primary;

                return (
                  <div key={u.id} style={{
                    background: C.surface, border: `1px solid ${isSelf ? C.primary + '44' : C.border}`, borderRadius: 14, overflow: 'hidden',
                    boxShadow: isSelf ? `0 0 20px ${C.primary}0a` : 'none',
                  }}>
                    {/* View Mode */}
                    {editingId !== u.id && resettingId !== u.id && (
                      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 10, background: `${rColor}15`, border: `1px solid ${rColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: rColor }}>
                            {u.role.name === 'admin' ? <IcShield /> : <IcUsers />}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>{u.fullName}</p>
                              {isSelf && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: `${C.primary}22`, color: C.primary, textTransform: 'uppercase' }}>You</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13, color: C.muted }}>{u.email}</span>
                              <span style={{ color: C.border }}>|</span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: rColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{u.role.name}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <button onClick={() => !isSelf && toggleActive(u)} disabled={isSelf && u.isActive} style={{
                            background: 'none', border: 'none', padding: 0, cursor: isSelf ? 'default' : 'pointer',
                            fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4,
                            color: u.isActive ? C.success : C.muted, opacity: isSelf ? 0.5 : 1
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.isActive ? C.success : C.muted }} />
                            {u.isActive ? 'Active' : 'Inactive'}
                          </button>
                          
                          <div style={{ width: 1, height: 16, background: C.border }} />

                          <button onClick={() => startEdit(u)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = C.text} onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                            <IcEdit /> Edit
                          </button>
                          <button onClick={() => startReset(u.id)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = C.primary} onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                            <IcKey /> Reset
                          </button>
                          {!isSelf && (
                            confirmingDeleteId === u.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: `${C.danger}11`, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.danger}33` }}>
                                <button onClick={() => handleDelete(u.id)} style={{ background: 'none', border: 'none', color: C.danger, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
                                <button onClick={() => setConfirmingDeleteId(null)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmingDeleteId(u.id)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = C.danger} onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                                <IcTrash />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {deleteError[u.id] && <div style={{ padding: '8px 24px', background: `${C.danger}11`, color: C.danger, fontSize: 12, borderTop: `1px solid ${C.danger}22` }}>{deleteError[u.id]}</div>}

                    {/* Edit Form */}
                    {editingId === u.id && (
                      <form onSubmit={e => handleEditSave(e, u.id)} style={{ padding: '20px 24px', background: `${C.elevated}66` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
                            Full Name
                            <input required value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} style={{ padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13, outline: 'none' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
                            Role
                            <select value={editForm.roleName} onChange={e => setEditForm({ ...editForm, roleName: e.target.value as EditFormState['roleName'] })} style={{ padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13, outline: 'none' }}>
                              {ROLE_NAMES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </label>
                        </div>
                        {editError && <div style={{ padding: '8px 12px', background: `${C.danger}15`, borderRadius: 6, color: C.danger, fontSize: 12, marginBottom: 12 }}>{editError}</div>}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="submit" disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: C.primary, color: '#fff', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Saving…' : 'Save Changes'}</button>
                          <button type="button" onClick={() => setEditingId(null)} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </form>
                    )}

                    {/* Reset Password Form */}
                    {resettingId === u.id && (
                      <form onSubmit={e => handleResetSave(e, u.id)} style={{ padding: '20px 24px', background: `${C.elevated}66` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
                            New Password
                            <input required type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" style={{ width: 240, padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13, outline: 'none' }} />
                          </label>
                          <button type="submit" disabled={saving} style={{ padding: '10px 16px', borderRadius: 6, border: 'none', background: C.warning, color: '#000', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Setting…' : 'Set Password'}</button>
                          <button type="button" onClick={() => setResettingId(null)} style={{ padding: '10px 16px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                        </div>
                        {resetSuccess && <p style={{ fontSize: 12, color: C.success, margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><IcCheck /> Password updated successfully.</p>}
                        {resetError && <p style={{ fontSize: 12, color: C.danger, margin: '12px 0 0' }}>{resetError}</p>}
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}
