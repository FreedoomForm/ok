import { Checkbox } from '@/components/ui/checkbox'
import type { Client } from '@/components/admin/dashboard/types'

export type DeletedClientsTableProps = {
  clients: Client[]
  selectedClients: Set<string>
  onToggleAll: (checked: boolean) => void
  onToggleClient: (clientId: string, checked: boolean) => void
  labels: {
    name: string
    phone: string
    address: string
    date: string
    role: string
    empty: string
  }
  locale: string
}

export function DeletedClientsTable({
  clients,
  selectedClients,
  onToggleAll,
  onToggleClient,
  labels,
  locale,
}: DeletedClientsTableProps) {
  return (
    <div data-testid="deleted-clients-table" className="relative w-full overflow-auto">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
              <Checkbox
                checked={clients.length > 0 && clients.every((client) => selectedClients.has(client.id))}
                onCheckedChange={(checked) => onToggleAll(checked === true)}
              />
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{labels.name}</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{labels.phone}</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{labels.address}</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{labels.date}</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{labels.role}</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {clients.map((client) => (
            <tr key={client.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <td className="p-4 align-middle">
                <Checkbox
                  checked={selectedClients.has(client.id)}
                  onCheckedChange={(checked) => onToggleClient(client.id, checked === true)}
                />
              </td>
              <td className="p-4 align-middle font-medium">{client.name}</td>
              <td className="p-4 align-middle">{client.phone}</td>
              <td className="p-4 align-middle">{client.address}</td>
              <td className="p-4 align-middle">
                {client.deletedAt ? new Date(client.deletedAt).toLocaleDateString(locale) : '-'}
              </td>
              <td className="p-4 align-middle">{client.deletedBy || '-'}</td>
            </tr>
          ))}
          {clients.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-4 text-center text-muted-foreground">{labels.empty}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
