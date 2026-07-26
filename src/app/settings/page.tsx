'use client'
import { getISTDateString } from '@/lib/dateUtils';

import React, { useState, useEffect, useRef } from 'react';
import { User, Bell, Monitor, Zap, Database, LogOut, Download, Upload, Trash2, Key, Save, Loader2, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { useSettings } from '@/lib/hooks/useSettings';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Confirm from '@/components/ui/Confirm';

function Toggle({ enabled, onChange, id }: { enabled: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={clsx(
        'w-11 h-6 rounded-full transition-colors relative flex items-center',
        enabled ? 'bg-jade' : 'bg-surface-raised border border-border'
      )}
    >
      <div className={clsx(
        'w-4 h-4 bg-white rounded-full transition-transform absolute shadow',
        enabled ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const { settings, updateSettings, loading: settingsLoading, refetch } = useSettings();
  const { theme, setTheme } = useTheme();

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // AI key
  const [openAiKey, setOpenAiKey] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);

  // Notifications (persisted in localStorage)
  const [notifications, setNotifications] = useState({
    daily: true,
    dsa: true,
    deadlines: true,
    desktop: false,
  });

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // User email
  const [userEmail, setUserEmail] = useState('');

  // ── Load initial values ─────────────────────────────────────
  useEffect(() => {
    if (settings) {
      setDisplayName(settings.display_name || '');
      setStartDate(settings.start_date || '');
    }
  }, [settings]);

  useEffect(() => {
    // Load AI key from localStorage
    setOpenAiKey(localStorage.getItem('yatra_openai_key') || '');
    // Load notifications prefs
    const saved = localStorage.getItem('yatra_notif_prefs');
    if (saved) {
      try { setNotifications(JSON.parse(saved)); } catch {}
    }
    // Get user email
    createClient().auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '');
    });
  }, []);

  // ── Handlers ───────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateSettings({ display_name: displayName, start_date: startDate });
      setProfileSaved(true);
      toast.success('Profile saved!');
      setTimeout(() => setProfileSaved(false), 2000);
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveAiKey = () => {
    localStorage.setItem('yatra_openai_key', openAiKey);
    toast.success('API key saved locally');
  };

  const toggleNotif = (key: string, val: boolean) => {
    const updated = { ...notifications, [key]: val };
    setNotifications(updated);
    localStorage.setItem('yatra_notif_prefs', JSON.stringify(updated));
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yatra-export-${getISTDateString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully!');
    } catch {
      toast.error('Export failed. Please try again.');
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportClick = () => fileInputRef.current?.click();
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables: data }),
      });
      
      if (!res.ok) throw new Error('Import failed');
      const result = await res.json();
      
      toast.success(`Data imported successfully! (${result.imported} records)`);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      toast.error('Failed to import data: ' + err.message);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
      router.push('/login');
    } catch {
      toast.error('Sign out failed');
      setSigningOut(false);
    }
  };

  const handleDeleteData = async () => {
    toast.error('Account deletion requires contacting support. Data export is available above.');
  };

  const getInitials = (name: string) => name ? name.slice(0, 2).toUpperCase() : 'YA';

  return (
    <div className="min-h-dvh bg-ink pb-16 animate-fade-in">
      <div className="max-w-3xl mx-auto px-5 pt-8">

        <header className="mb-8">
          <h1 className="page-title">Settings</h1>
          <p className="text-secondary text-sm font-mono mt-1">Manage your preferences, data, and account.</p>
        </header>

        <div className="flex flex-col gap-6">

          {/* ── Profile ── */}
          <section className="card p-6">
            <h2 className="text-sm font-mono text-muted uppercase tracking-widest mb-5 flex items-center gap-2">
              <User size={14} className="text-jade" /> Profile
            </h2>

            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-jade/10 text-jade flex items-center justify-center text-xl font-display font-bold border border-jade/20 shrink-0">
                {settingsLoading ? '…' : getInitials(displayName)}
              </div>
              <div className="text-sm text-muted">
                <div className="text-primary font-medium">{displayName || 'User'}</div>
                <div className="font-mono text-xs mt-0.5">{userEmail}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="input-display-name">Display Name</label>
                <input
                  id="input-display-name"
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="input w-full"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="label" htmlFor="input-email">Email</label>
                <input
                  id="input-email"
                  type="email"
                  value={userEmail}
                  disabled
                  className="input w-full opacity-50 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="label" htmlFor="input-start-date">Journey Start Date</label>
              <input
                id="input-start-date"
                type="date"
                value={startDate ? startDate.substring(0, 10) : ''}
                onChange={e => setStartDate(e.target.value)}
                className="input w-full md:w-1/2"
              />
              <p className="text-xs text-muted mt-1.5">Determines your current day number and phase.</p>
            </div>

            <div className="flex justify-end mt-4">
              <button
                id="btn-save-profile"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="btn btn-jade btn-sm flex items-center gap-2"
              >
                {savingProfile ? <Loader2 size={14} className="animate-spin" /> : profileSaved ? <Check size={14} /> : <Save size={14} />}
                {profileSaved ? 'Saved!' : 'Save Profile'}
              </button>
            </div>
          </section>

          {/* ── Appearance ── */}
          <section className="card p-6">
            <h2 className="text-sm font-mono text-muted uppercase tracking-widest mb-5 flex items-center gap-2">
              <Monitor size={14} className="text-jade" /> Appearance
            </h2>
            <label className="label">Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {(['dark', 'light', 'system'] as const).map(t => (
                <button
                  key={t}
                  id={`theme-${t}`}
                  onClick={() => setTheme(t)}
                  className={clsx(
                    'p-3 rounded-xl border flex flex-col items-center gap-2 transition-all text-sm',
                    theme === t
                      ? 'border-jade bg-jade/5 text-jade'
                      : 'border-border bg-surface text-secondary hover:border-secondary'
                  )}
                >
                  <div className={clsx(
                    'w-full h-8 rounded flex items-center justify-center border',
                    t === 'dark' ? 'bg-[#14161C] border-white/10' :
                    t === 'light' ? 'bg-gray-100 border-black/10' :
                    'bg-gradient-to-r from-[#14161C] to-gray-100 border-white/10'
                  )}>
                    <span className="text-jade text-xs font-bold">A</span>
                  </div>
                  <span className="capitalize font-medium">{t}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Notifications ── */}
          <section className="card p-6">
            <h2 className="text-sm font-mono text-muted uppercase tracking-widest mb-5 flex items-center gap-2">
              <Bell size={14} className="text-gold" /> Notifications
            </h2>
            <div className="space-y-1">
              {([
                { key: 'daily',     label: 'Daily Reminders' },
                { key: 'dsa',       label: 'DSA Review Reminders' },
                { key: 'deadlines', label: 'Task Deadline Alerts' },
                { key: 'desktop',   label: 'Desktop Notifications' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <span className="text-sm text-primary">{label}</span>
                  <Toggle
                    id={`toggle-${key}`}
                    enabled={notifications[key]}
                    onChange={v => toggleNotif(key, v)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ── AI Coach ── */}
          <section className="card p-6">
            <h2 className="text-sm font-mono text-muted uppercase tracking-widest mb-5 flex items-center gap-2">
              <Zap size={14} className="text-sky-400" /> AI Coach
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="input-openai-key">OpenAI API Key (stored locally in browser)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      id="input-openai-key"
                      type={keyVisible ? 'text' : 'password'}
                      value={openAiKey}
                      onChange={e => setOpenAiKey(e.target.value)}
                      placeholder="sk-..."
                      className="input w-full pl-9"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setKeyVisible(v => !v)}
                    className="btn btn-ghost btn-sm px-3"
                    title={keyVisible ? 'Hide' : 'Show'}
                  >
                    {keyVisible ? <X size={14} /> : <Key size={14} />}
                  </button>
                  <button
                    id="btn-save-ai-key"
                    onClick={handleSaveAiKey}
                    className="btn btn-jade btn-sm"
                  >
                    Save
                  </button>
                </div>
                <p className="text-xs text-muted mt-1.5">Your key is stored only in your browser. Never sent to our servers.</p>
              </div>
            </div>
          </section>

          {/* ── Data ── */}
          <section className="card p-6">
            <h2 className="text-sm font-mono text-muted uppercase tracking-widest mb-5 flex items-center gap-2">
              <Database size={14} className="text-primary" /> Data Management
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                id="btn-export"
                onClick={handleExport}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-raised border border-border hover:bg-surface hover:border-secondary transition-all text-sm font-medium"
              >
                <Download size={15} /> Export All Data (JSON)
              </button>
              <button
                id="btn-import"
                onClick={handleImportClick}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-raised border border-border hover:bg-surface hover:border-secondary transition-all text-sm font-medium"
              >
                <Upload size={15} /> Import Data
              </button>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
            </div>

            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-xs font-mono text-brick uppercase tracking-widest mb-2">Danger Zone</p>
              <p className="text-xs text-muted mb-3">Permanently delete all your Yatra data. This cannot be undone.</p>
              <button
                id="btn-delete-account"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 py-2 px-4 rounded-lg bg-brick/10 text-brick border border-brick/30 hover:bg-brick hover:text-white transition-all text-sm font-medium"
              >
                <Trash2 size={15} /> Delete Account Data
              </button>
            </div>
          </section>

          {/* ── Sign Out ── */}
          <div className="flex justify-between items-center px-1 pb-4">
            <button
              id="btn-sign-out"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-2 text-muted hover:text-brick transition-colors text-sm font-medium"
            >
              {signingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
              Sign Out
            </button>
            <span className="text-xs text-muted font-mono">Yatra v1.0</span>
          </div>
        </div>
      </div>

      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteData}
        title="Delete Account Data?"
        message="This will permanently delete all your DSA problems, habits, tasks, goals, journal entries, and all other data. This action cannot be undone."
        confirmText="Delete Everything"
        variant="danger"
      />
    </div>
  );
}
