import React, { useEffect } from "react";
import { FormProvider } from "react-hook-form";
import { FormField, FormInput, FormSelect } from "../form";
import Button from "../Button";
import {
  accountToRowFormValues,
  adminAccountRowSchema,
  useZodForm,
  type AdminAccountRowFormValues,
} from "../../lib/form";

export type AdminUserRowFormProps = {
  name: React.ReactNode;
  email: React.ReactNode;
  baseline: {
    role: string;
    roleTitle?: string | null;
    status?: string | null;
  };
  roleOptions: readonly { value: string; label: string }[];
  statusOptions: readonly { value: string; label: string }[];
  roleTitleFromRole: (role: string) => string;
  saving: boolean;
  onSave: (values: AdminAccountRowFormValues) => void | Promise<void>;
};

const AdminUserRowForm: React.FC<AdminUserRowFormProps> = ({
  name,
  email,
  baseline,
  roleOptions,
  statusOptions,
  roleTitleFromRole,
  saving,
  onSave,
}) => {
  const form = useZodForm(adminAccountRowSchema, {
    defaultValues: accountToRowFormValues(baseline),
    mode: "onChange",
  });

  const { reset, watch, setValue, handleSubmit, formState } = form;

  useEffect(() => {
    reset(accountToRowFormValues(baseline));
  }, [baseline.role, baseline.roleTitle, baseline.status, reset]);

  useEffect(() => {
    const sub = watch((values, { name: fieldName, type }) => {
      if (type !== "change" || fieldName !== "role" || !values.role) return;
      setValue("roleTitle", roleTitleFromRole(values.role), {
        shouldDirty: true,
        shouldValidate: true,
      });
    });
    return () => sub.unsubscribe();
  }, [watch, setValue, roleTitleFromRole]);

  const submit = handleSubmit(async (values) => {
    await onSave(values);
    reset(values);
  });

  const currentRole = watch("role");

  return (
    <FormProvider {...form}>
      <tr className="border-t border-slate-100 dark:border-white/5">
        <td className="px-4 py-3 text-slate-900 dark:text-white">{name}</td>
        <td className="px-4 py-3 text-slate-600 dark:text-[#cbd5e1]">{email}</td>
        <td className="px-4 py-3">
          <FormField<AdminAccountRowFormValues>
            name="role"
            className="space-y-0"
          >
            <FormSelect variant="admin" compact disabled={saving}>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </td>
        <td className="px-4 py-3">
          <FormField<AdminAccountRowFormValues>
            name="roleTitle"
            className="space-y-0"
          >
            <FormInput
              type="text"
              variant="admin"
              compact
              disabled={saving}
              placeholder={roleTitleFromRole(currentRole)}
            />
          </FormField>
        </td>
        <td className="px-4 py-3">
          <FormField<AdminAccountRowFormValues>
            name="status"
            className="space-y-0"
          >
            <FormSelect variant="admin" compact disabled={saving}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </td>
        <td className="px-4 py-3 text-right">
          <Button
            type="button"
            variant={formState.isDirty ? "success" : "secondary"}
            disabled={saving || !formState.isDirty}
            onClick={() => void submit()}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40 ${
              formState.isDirty
                ? "!bg-[#4cceac] !text-[#141b2d] hover:!bg-[#5fd8b9]"
                : ""
            }`}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </td>
      </tr>
    </FormProvider>
  );
};

export default AdminUserRowForm;
