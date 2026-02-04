import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  PennyekartAgent, 
  AgentRole, 
  ROLE_LABELS, 
  ROLE_HIERARCHY,
  getParentRole,
  useAgentMutations 
} from "@/hooks/usePennyekartAgents";
import { toast } from "sonner";

const agentFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  mobile: z.string().regex(/^[0-9]{10}$/, "Mobile must be 10 digits"),
  role: z.enum(["team_leader", "coordinator", "group_leader", "pro"] as const),
  panchayath_id: z.string().uuid("Select a panchayath"),
  ward: z.string().min(1, "Ward is required").max(50),
  parent_agent_id: z.string().uuid().nullable().optional(),
  customer_count: z.number().int().min(0).default(0),
  responsible_panchayath_ids: z.array(z.string()).default([]),
});

type AgentFormValues = z.infer<typeof agentFormSchema>;

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: PennyekartAgent | null;
  onSuccess: () => void;
}

interface Panchayath {
  id: string;
  name: string;
}

export function AgentFormDialog({ open, onOpenChange, agent, onSuccess }: AgentFormDialogProps) {
  const [panchayaths, setPanchayaths] = useState<Panchayath[]>([]);
  const [potentialParents, setPotentialParents] = useState<PennyekartAgent[]>([]);
  const [isLoadingPanchayaths, setIsLoadingPanchayaths] = useState(false);
  const { createAgent, updateAgent, isSubmitting } = useAgentMutations();

  const isEditing = !!agent;

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      mobile: "",
      role: "pro",
      panchayath_id: "",
      ward: "",
      parent_agent_id: null,
      customer_count: 0,
      responsible_panchayath_ids: [],
    },
  });

  const selectedRole = form.watch("role");
  const selectedPanchayath = form.watch("panchayath_id");

  // Load panchayaths
  useEffect(() => {
    const fetchPanchayaths = async () => {
      setIsLoadingPanchayaths(true);
      const { data } = await supabase
        .from("panchayaths")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      
      setPanchayaths(data || []);
      setIsLoadingPanchayaths(false);
    };

    if (open) {
      fetchPanchayaths();
    }
  }, [open]);

  // Load potential parent agents based on selected role
  useEffect(() => {
    const fetchParentAgents = async () => {
      const parentRole = getParentRole(selectedRole);
      if (!parentRole || !selectedPanchayath) {
        setPotentialParents([]);
        return;
      }

      const { data } = await supabase
        .from("pennyekart_agents")
        .select("id, name, role, ward")
        .eq("panchayath_id", selectedPanchayath)
        .eq("role", parentRole)
        .eq("is_active", true)
        .order("name");

      setPotentialParents((data as unknown as PennyekartAgent[]) || []);
    };

    fetchParentAgents();
  }, [selectedRole, selectedPanchayath]);

  // Reset form when dialog opens/closes or agent changes
  useEffect(() => {
    if (open && agent) {
      form.reset({
        name: agent.name,
        mobile: agent.mobile,
        role: agent.role,
        panchayath_id: agent.panchayath_id,
        ward: agent.ward,
        parent_agent_id: agent.parent_agent_id,
        customer_count: agent.customer_count,
        responsible_panchayath_ids: agent.responsible_panchayath_ids || [],
      });
    } else if (open) {
      form.reset({
        name: "",
        mobile: "",
        role: "pro",
        panchayath_id: "",
        ward: "",
        parent_agent_id: null,
        customer_count: 0,
        responsible_panchayath_ids: [],
      });
    }
  }, [open, agent, form]);

  const onSubmit = async (values: AgentFormValues) => {
    // Team leaders don't have parents
    if (values.role === "team_leader") {
      values.parent_agent_id = null;
    } else {
      // Non-team-leaders don't have responsible panchayaths
      values.responsible_panchayath_ids = [];
    }

    // Only PROs can have customer count
    if (values.role !== "pro") {
      values.customer_count = 0;
    }

    if (isEditing && agent) {
      const { error } = await updateAgent(agent.id, values);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Agent updated successfully");
    } else {
      const agentData = {
        name: values.name,
        mobile: values.mobile,
        role: values.role,
        panchayath_id: values.panchayath_id,
        ward: values.ward,
        parent_agent_id: values.parent_agent_id || null,
        customer_count: values.customer_count,
        is_active: true,
        created_by: null,
        responsible_panchayath_ids: values.responsible_panchayath_ids,
        responsible_wards: [],
      };
      const { error } = await createAgent(agentData);
      if (error) {
        if (error.includes("unique")) {
          toast.error("Mobile number already exists");
        } else {
          toast.error(error);
        }
        return;
      }
      toast.success("Agent created successfully");
    }

    onOpenChange(false);
    onSuccess();
  };

  const parentRole = getParentRole(selectedRole);
  const needsParent = selectedRole !== "team_leader";

  const handleResponsiblePanchayathToggle = (panchayathId: string, checked: boolean) => {
    const current = form.getValues("responsible_panchayath_ids") || [];
    if (checked) {
      form.setValue("responsible_panchayath_ids", [...current, panchayathId]);
    } else {
      form.setValue("responsible_panchayath_ids", current.filter(id => id !== panchayathId));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 text-left">
          <DialogTitle className="text-lg">{isEditing ? "Edit Agent" : "Add New Agent"}</DialogTitle>
          <DialogDescription className="text-sm">
            {isEditing ? "Update agent details" : "Add a new agent to the hierarchy"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6">
          <Form {...form}>
            <form id="agent-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Agent name" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="10-digit mobile" maxLength={10} className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROLE_HIERARCHY.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="panchayath_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Panchayath</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder={isLoadingPanchayaths ? "Loading..." : "Select"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {panchayaths.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ward"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Ward</FormLabel>
                    <FormControl>
                      <Input placeholder="Ward name/number" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {needsParent && (
                <FormField
                  control={form.control}
                  name="parent_agent_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Reports To ({parentRole ? ROLE_LABELS[parentRole] : ""})
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder={
                              !selectedPanchayath 
                                ? "Select panchayath first" 
                                : potentialParents.length === 0 
                                  ? `No ${parentRole ? ROLE_LABELS[parentRole] : "parent"} available` 
                                  : "Select parent"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {potentialParents.map((parent) => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.name} ({parent.ward})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedRole === "team_leader" && (
                <FormField
                  control={form.control}
                  name="responsible_panchayath_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Responsible Panchayaths</FormLabel>
                      <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2 bg-muted/30">
                        {isLoadingPanchayaths ? (
                          <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : panchayaths.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No panchayaths available</p>
                        ) : (
                          panchayaths.map((p) => (
                            <div key={p.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`resp-${p.id}`}
                                checked={(field.value || []).includes(p.id)}
                                onCheckedChange={(checked) => 
                                  handleResponsiblePanchayathToggle(p.id, checked === true)
                                }
                              />
                              <label 
                                htmlFor={`resp-${p.id}`} 
                                className="text-sm cursor-pointer flex-1"
                              >
                                {p.name}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedRole === "pro" && (
                <FormField
                  control={form.control}
                  name="customer_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Customer Count</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
                          className="h-10"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-2 px-4 pb-4 sm:px-6 sm:pb-6 border-t pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="agent-form"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
