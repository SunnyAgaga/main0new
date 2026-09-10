import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListAdminUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
  useDeleteAdminUser,
  getListAdminUsersQueryKey,
  type AuthUser,
} from '@/api';
import { PERMISSION_KEYS, PERMISSION_LABELS, type PermissionKey } from '@wedplan/shared';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Trash2, UserPlus, Pencil } from 'lucide-react';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager'], { required_error: 'Select a role' }),
  permissions: z.array(z.string()).default([]),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

function PermissionChecklist({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const toggle = (key: PermissionKey, checked: boolean) => {
    onChange(checked ? [...value, key] : value.filter((k) => k !== key));
  };

  return (
    <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border border-border bg-muted/30">
      {PERMISSION_KEYS.map((key) => (
        <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={value.includes(key)} onCheckedChange={(checked) => toggle(key, checked === true)} />
          {PERMISSION_LABELS[key]}
        </label>
      ))}
    </div>
  );
}

function AddUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createUser = useCreateAdminUser();

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', password: '', role: 'manager', permissions: [] },
  });

  const role = form.watch('role');

  const onSubmit = (values: CreateUserValues) => {
    createUser.mutate({ data: values }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        toast({ title: 'User added', description: `${values.email} can now sign in.` });
        form.reset({ email: '', password: '', role: 'manager', permissions: [] });
        onOpenChange(false);
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Could not add user',
          description: err.data?.error || 'An error occurred.',
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a team member</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="coordinator@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manager">Manager — pick specific menus below</SelectItem>
                      <SelectItem value="admin">Admin — full access to everything</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {role === 'manager' && (
              <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menus this manager can access</FormLabel>
                    <FormControl>
                      <PermissionChecklist value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button type="submit" className="w-full" disabled={createUser.isPending}>
              {createUser.isPending ? 'Adding…' : 'Add User'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const editUserSchema = z.object({
  role: z.enum(['admin', 'manager']),
  permissions: z.array(z.string()).default([]),
});
type EditUserValues = z.infer<typeof editUserSchema>;

function EditUserDialog({ targetUser, onClose }: { targetUser: AuthUser; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateUser = useUpdateAdminUser();

  const form = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { role: targetUser.role, permissions: targetUser.permissions },
  });

  const role = form.watch('role');

  const onSubmit = (values: EditUserValues) => {
    updateUser.mutate({ id: targetUser.id, data: values }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getListAdminUsersQueryKey(), (old: AuthUser[] | undefined) =>
          old?.map((u) => (u.id === updated.id ? updated : u)),
        );
        toast({ title: 'Access updated' });
        onClose();
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Could not update access',
          description: err.data?.error || 'An error occurred.',
        });
      },
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit access for {targetUser.email}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manager">Manager — pick specific menus below</SelectItem>
                      <SelectItem value="admin">Admin — full access to everything</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {role === 'manager' && (
              <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menus this manager can access</FormLabel>
                    <FormControl>
                      <PermissionChecklist value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardTeam() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);

  const { data: users, isLoading } = useListAdminUsers();
  const deleteUser = useDeleteAdminUser();

  const handleDelete = (id: number, email: string) => {
    if (!window.confirm(`Remove ${email}? They will lose access immediately.`)) return;

    deleteUser.mutate({ id }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        toast({ title: 'User removed' });
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Could not remove user',
          description: err.data?.error || 'An error occurred.',
        });
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Team</h1>
          <p className="text-muted-foreground mt-1">
            Manage who can sign in, and which menus each manager can access.
          </p>
        </div>
        <AddUserDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        {isLoading ? (
          <CardContent className="p-6">
            <Skeleton className="h-32 rounded-lg" />
          </CardContent>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Menu Access</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No users yet.
                  </TableCell>
                </TableRow>
              ) : (
                users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.email}
                      {u.id === currentUser?.id && (
                        <span className="text-muted-foreground text-xs ml-2">(you)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.role === 'admin' ? (
                        <span className="text-sm text-muted-foreground">Everything</span>
                      ) : u.permissions.length === 0 ? (
                        <span className="text-sm text-muted-foreground">None yet</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {u.permissions.map((p) => (
                            <Badge key={p} variant="outline" className="text-xs">
                              {PERMISSION_LABELS[p as PermissionKey] ?? p}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={u.id === currentUser?.id}
                        onClick={() => setEditing(u)}
                        aria-label={`Edit access for ${u.email}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={u.id === currentUser?.id || deleteUser.isPending}
                        onClick={() => handleDelete(u.id, u.email)}
                        aria-label={`Remove ${u.email}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {editing && <EditUserDialog targetUser={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
