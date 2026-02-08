import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Shield } from "lucide-react";

interface Division {
  id: string;
  name: string;
}

interface Admin {
  id: string;
  user_id: string | null;
  division_id: string;
  is_active: boolean;
  created_at: string;
  phone?: string;
  full_name?: string;
  access_all_divisions?: boolean;
  additional_division_ids?: string[];
  division?: { name: string };
}

interface AdminsTableProps {
  admins: Admin[];
  divisions: Division[];
  onEdit: (admin: Admin) => void;
  onDelete: (admin: Admin) => void;
  onToggleStatus: (adminId: string, currentStatus: boolean) => void;
  onManagePermissions: (admin: Admin) => void;
}

export function AdminsTable({
  admins,
  divisions,
  onEdit,
  onDelete,
  onToggleStatus,
  onManagePermissions,
}: AdminsTableProps) {
  const getDivisionNames = (admin: Admin) => {
    if (admin.access_all_divisions) return "All Divisions";
    const additionalCount = admin.additional_division_ids?.length ?? 0;
    if (additionalCount > 0) {
      const names = admin.additional_division_ids!
        .map((id) => divisions.find((d) => d.id === id)?.name)
        .filter(Boolean);
      return `${admin.division?.name || "Primary"}${names.length > 0 ? ` + ${names.join(", ")}` : ""}`;
    }
    return admin.division?.name || "N/A";
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No admins found. Create your first admin to get started.
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {admin.full_name || "N/A"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{admin.phone || "N/A"}</TableCell>
                  <TableCell className="whitespace-nowrap">{admin.division?.name || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {admin.access_all_divisions ? (
                        <Badge variant="default" className="text-[10px]">All Divisions</Badge>
                      ) : (admin.additional_division_ids?.length ?? 0) > 0 ? (
                        <Badge variant="secondary" className="text-[10px]">
                          +{admin.additional_division_ids!.length} Division
                          {admin.additional_division_ids!.length !== 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Primary only</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onManagePermissions(admin)}
                        title="Manage permissions"
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                        admin.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {admin.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(admin.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(admin)} title="Edit admin">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(admin)}
                        title="Delete admin"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleStatus(admin.id, admin.is_active ?? true)}
                      >
                        {admin.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
