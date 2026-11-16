import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, apiPage, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, InlineError } from '@/components/common/states';
import { Pagination } from '@/components/common/pagination';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { WorkspaceHeading, DataTable, QueryState, Status } from './workspace-components';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}
export function AdminManagementPage() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Admin | 'new' | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [password, setPassword] = useState('');
  const [resetting, setResetting] = useState<Admin | null>(null);
  const query = useQuery({
    queryKey: ['admin-management', page, search],
    queryFn: () => apiPage<Admin>('/admin/admins', { query: { page, q: search } }),
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['admin-management'] });
    void client.invalidateQueries({ queryKey: ['me'] });
  };
  const save = useMutation({
    mutationFn: () =>
      api(editing === 'new' ? '/admin/admins' : `/admin/admins/${(editing as Admin).id}`, {
        method: editing === 'new' ? 'POST' : 'PATCH',
        body: { name, email, role, ...(editing === 'new' ? { password } : {}) },
      }),
    onSuccess: () => {
      refresh();
      setEditing(null);
      setPassword('');
      toast.success('Data admin disimpan');
    },
  });
  const status = useMutation({
    mutationFn: (admin: Admin) =>
      api(`/admin/admins/${admin.id}`, {
        method: 'PATCH',
        body: { status: admin.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
      }),
    onSuccess: () => {
      refresh();
      toast.success('Status admin diperbarui');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const reset = useMutation({
    mutationFn: () =>
      api(`/admin/admins/${resetting!.id}/reset-password`, { method: 'POST', body: { password } }),
    onSuccess: () => {
      setResetting(null);
      setPassword('');
      toast.success('Password direset dan refresh session dicabut');
    },
  });
  function edit(admin: Admin | 'new') {
    setEditing(admin);
    setName(admin === 'new' ? '' : admin.name);
    setEmail(admin === 'new' ? '' : admin.email);
    setRole(admin === 'new' ? 'ADMIN' : admin.role);
    setPassword('');
    save.reset();
  }
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title="Admin Management"
        description="Kelola akun administrasi platform. Superadmin aktif terakhir dilindungi oleh database transaction."
        action={<Button onClick={() => edit('new')}>Tambah admin</Button>}
      />
      <label className="grid max-w-sm gap-2 text-sm font-medium">
        Cari admin
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </label>
      <QueryState query={query} empty={query.data?.data.length === 0}>
        <DataTable
          caption="Akun administrator"
          headers={['Nama', 'Email', 'Role', 'Status', 'Dibuat', 'Aksi']}
        >
          {query.data?.data.map((admin) => (
            <tr key={admin.id}>
              <td className="font-medium">{admin.name}</td>
              <td>{admin.email}</td>
              <td>{admin.role}</td>
              <td>
                <Status value={admin.status} />
              </td>
              <td>{formatDateTime(admin.createdAt)}</td>
              <td>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => edit(admin)}>
                    Detail / edit
                  </Button>
                  <ConfirmDialog
                    title={admin.status === 'ACTIVE' ? 'Nonaktifkan admin?' : 'Aktifkan admin?'}
                    description={`Ubah akses akun ${admin.email}. Perubahan ini dicatat dalam audit log.`}
                    trigger={
                      <Button size="sm" variant="outline" disabled={status.isPending}>
                        {admin.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                    }
                    onConfirm={() => status.mutate(admin)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setResetting(admin);
                      setPassword('');
                      reset.reset();
                    }}
                  >
                    Reset password
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
        <Pagination meta={query.data?.meta} onPageChange={setPage} />
      </QueryState>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Tambah admin' : 'Detail & edit admin'}</DialogTitle>
            <DialogDescription>
              Hak operasional Admin dan Superadmin sama. Superadmin memiliki pengelolaan sistem
              tambahan.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <Field label="Nama" htmlFor="admin-name" required>
              <Input
                id="admin-name"
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <Field label="Email" htmlFor="admin-email" required>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Field label="Role" htmlFor="admin-role">
              <select
                id="admin-role"
                className="h-11 w-full rounded-lg border border-slate-300 px-3"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option>ADMIN</option>
                <option>SUPERADMIN</option>
              </select>
            </Field>
            {editing === 'new' ? (
              <Field label="Password awal" htmlFor="admin-password" required>
                <Input
                  id="admin-password"
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </Field>
            ) : null}
            <InlineError error={save.error} />
            <Button type="submit" disabled={save.isPending}>
              Simpan admin
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(resetting)}
        onOpenChange={(open) => {
          if (!open) setResetting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password admin</DialogTitle>
            <DialogDescription>
              {resetting?.email}. Refresh session aktif akan dicabut.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              reset.mutate();
            }}
          >
            <Field label="Password baru" htmlFor="reset-password" required>
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <InlineError error={reset.error} />
            <Button type="submit" disabled={reset.isPending}>
              Reset password
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface Permission {
  role: string;
  permission: string;
  enabled: boolean;
  scope: string;
  editable: boolean;
}
export function RolePermissionsPage() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['role-permissions'],
    queryFn: () => api<{ permissions: Permission[] }>('/admin/permissions'),
  });
  const mutation = useMutation({
    mutationFn: (permission: Permission) =>
      api('/admin/permissions', {
        method: 'PATCH',
        body: {
          role: permission.role,
          permission: permission.permission,
          enabled: !permission.enabled,
        },
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Permission diperbarui');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title="Roles & Permissions"
        description="Permission operasional Admin dan Superadmin dikunci setara. Creator selalu dibatasi ke organizer sendiri; perubahan permission tidak dapat memberikan akses global."
      />
      <QueryState query={query}>
        <DataTable
          caption="Matriks permission"
          headers={['Role', 'Modul', 'Lingkup data', 'Akses', 'Pengaturan']}
        >
          {query.data?.permissions.map((permission) => (
            <tr key={`${permission.role}-${permission.permission}`}>
              <td>{permission.role}</td>
              <td>{permission.permission}</td>
              <td>{permission.scope}</td>
              <td>{permission.enabled ? 'Diizinkan' : 'Tidak diizinkan'}</td>
              <td>
                {permission.editable ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate(permission)}
                  >
                    {permission.enabled ? 'Nonaktifkan' : 'Aktifkan'}
                    <span className="sr-only">
                      {' '}
                      {permission.permission} untuk {permission.role}
                    </span>
                  </Button>
                ) : (
                  <span className="text-xs text-slate-600">Dikunci kebijakan role</span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </QueryState>
    </div>
  );
}
