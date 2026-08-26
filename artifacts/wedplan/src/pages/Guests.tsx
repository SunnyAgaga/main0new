import { useState } from "react"
import { useListGuests, useUpdateGuestRsvp, getListGuestsQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, UserCheck, UserMinus, Clock } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"

export default function Guests() {
  const { data: guests, isLoading } = useListGuests()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  
  const updateRsvp = useUpdateGuestRsvp()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const handleRsvpChange = (id: number, newRsvp: 'attending' | 'pending' | 'declined') => {
    updateRsvp.mutate({ id, data: { rsvp: newRsvp } }, {
      onSuccess: () => {
        toast({ title: "RSVP Updated" })
        queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
      },
      onError: () => {
        toast({ title: "Failed to update RSVP", variant: "destructive" })
      }
    })
  }

  if (isLoading) {
    return <div className="animate-pulse bg-muted rounded-xl h-[400px] w-full"></div>
  }

  const filteredGuests = guests?.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase()) || 
                          (g.email ?? "").toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === "all" || g.rsvp === filter
    return matchesSearch && matchesFilter
  }) || []

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif text-primary">Guest Management</h1>
        <p className="text-muted-foreground mt-1">Review registrations and manage RSVPs.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search guests by name or email..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Guests</SelectItem>
                  <SelectItem value="attending">Attending</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Party Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No guests found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGuests.map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell>
                        <div className="font-medium">{guest.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Reg: {new Date(guest.registeredAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{guest.email}</div>
                        <div className="text-sm text-muted-foreground">{guest.phone}</div>
                      </TableCell>
                      <TableCell>{guest.partySize}</TableCell>
                      <TableCell>
                        <Badge variant={
                          guest.rsvp === 'attending' ? 'success' : 
                          guest.rsvp === 'declined' ? 'destructive' : 
                          'warning'
                        } className="capitalize">
                          {guest.rsvp}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select 
                          value={guest.rsvp} 
                          onValueChange={(val) => handleRsvpChange(guest.id, val as 'attending' | 'pending' | 'declined')}
                          disabled={updateRsvp.isPending && updateRsvp.variables?.id === guest.id}
                        >
                          <SelectTrigger className="w-[130px] ml-auto h-8 text-xs">
                            <SelectValue placeholder="Update Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="attending">Mark Attending</SelectItem>
                            <SelectItem value="pending">Mark Pending</SelectItem>
                            <SelectItem value="declined">Mark Declined</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
