import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListAsoebi,
  useCreateAsoebiItem,
  useUpdateAsoebiItem,
  useDeleteAsoebiItem,
  getListAsoebiQueryKey,
  type AsoebiItem,
} from '@/api';
import { customFetch, ApiError } from '@/api/custom-fetch';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, Loader2, Pencil, Plus, ShoppingBag, Trash2 } from 'lucide-react';

function useImageUpload() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const result = await customFetch<{ url: string }>('/api/admin/uploads', {
        method: 'POST',
        body: (() => {
          const formData = new FormData();
          formData.append('file', file);
          return formData;
        })(),
      });
      return result.url;
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err instanceof ApiError ? (err.data as { error?: string } | null)?.error || err.message : 'An error occurred.',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}

const itemSchema = z.object({
  category: z.enum(['women', 'men'], { required_error: 'Select a category' }),
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
  imageUrl: z.string().optional(),
  available: z.boolean(),
});

type ItemValues = z.infer<typeof itemSchema>;

const EMPTY_VALUES: ItemValues = {
  category: 'women',
  name: '',
  description: '',
  price: 0,
  imageUrl: '',
  available: true,
};

export default function DashboardAsoebi() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AsoebiItem | null>(null);
  const { upload, uploading } = useImageUpload();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: items, isLoading } = useListAsoebi();
  const createItem = useCreateAsoebiItem();
  const updateItem = useUpdateAsoebiItem();
  const deleteItem = useDeleteAsoebiItem();

  const form = useForm<ItemValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (editingItem) {
      form.reset({
        category: editingItem.category,
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        imageUrl: editingItem.imageUrl,
        available: editingItem.available,
      });
    } else {
      form.reset(EMPTY_VALUES);
    }
  }, [editingItem, form]);

  const isSaving = createItem.isPending || updateItem.isPending;

  const onSubmit = (values: ItemValues) => {
    const payload = { ...values, imageUrl: values.imageUrl || '' };

    const onDone = (successMessage: string) => {
      void queryClient.invalidateQueries({ queryKey: getListAsoebiQueryKey() });
      toast({ title: successMessage });
      setDialogOpen(false);
      setEditingItem(null);
    };
    const onFail = (err: { data?: { error?: string } | null }) => {
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: err.data?.error || 'An error occurred.',
      });
    };

    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, data: payload }, {
        onSuccess: () => onDone('Item updated'),
        onError: onFail,
      });
    } else {
      createItem.mutate({ data: payload }, {
        onSuccess: () => onDone('Item added'),
        onError: onFail,
      });
    }
  };

  const onDelete = (item: AsoebiItem) => {
    if (!window.confirm(`Remove "${item.name}"? This cannot be undone.`)) return;

    deleteItem.mutate({ id: item.id }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListAsoebiQueryKey() });
        toast({ title: 'Item removed' });
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Could not remove item',
          description: err.data?.error || 'An error occurred.',
        });
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-7 h-7" /> Asoebi Catalog
          </h1>
          <p className="text-muted-foreground mt-1">
            Add, edit, or remove the Asoebi options guests can select on the RSVP page.
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setEditingItem(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit item' : 'Add a new item'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="women">Women</SelectItem>
                          <SelectItem value="men">Men</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 3 Yards + Gele" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What's included in this package" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (NGN)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image (Optional)</FormLabel>
                      <div className="flex items-start gap-3">
                        {field.value ? (
                          <img src={field.value} alt="" className="w-16 h-16 rounded-md object-cover border border-border" />
                        ) : null}
                        <div className="flex-1 space-y-2">
                          <FormControl>
                            <Input placeholder="https://example.com/fabric.jpg" {...field} />
                          </FormControl>
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (!file) return;
                              const url = await upload(file);
                              if (url) field.onChange(url);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploading}
                            onClick={() => imageInputRef.current?.click()}
                          >
                            {uploading ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <ImagePlus className="w-4 h-4 mr-1" />
                            )}
                            {uploading ? 'Uploading...' : 'Upload Image'}
                          </Button>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="available"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                      <FormLabel className="mb-0">Available for purchase</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? 'Saving…' : editingItem ? 'Save Changes' : 'Add Item'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        {isLoading ? (
          <CardContent className="p-6">
            <Skeleton className="h-64 rounded-lg" />
          </CardContent>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!items || items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No items yet. Add your first Asoebi option above.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-md object-cover border border-border shrink-0" />
                        ) : null}
                        <div className="min-w-0">
                          <div>{item.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{item.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{item.category}</TableCell>
                    <TableCell>{item.currency} {item.price.toLocaleString()}</TableCell>
                    <TableCell>
                      {item.available ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Available</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-none">Sold Out</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(item);
                          setDialogOpen(true);
                        }}
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item)}
                        disabled={deleteItem.isPending}
                        aria-label={`Remove ${item.name}`}
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
    </div>
  );
}
