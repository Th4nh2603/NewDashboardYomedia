export type PlatformBannerColumn = { name: string; label: string };

export type PlatformFormFieldOption = {
  value: string;
  label: string;
  selected?: boolean;
  width?: number;
  height?: number;
};

export type PlatformFormField = {
  id: string;
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "file" | "size";
  value?: string;
  placeholder?: string;
  maxlength?: number;
  checked?: boolean;
  width?: string;
  height?: string;
  options?: PlatformFormFieldOption[];
  optionTotal?: number;
};

export type PlatformModuleData = {
  url: string;
  fetchedAt: string;
  title: string;
  profileName: string | null;
  profileRole: string | null;
  grid: {
    page: number;
    total: number;
    records: number;
    rows: Record<string, unknown>[];
    columns: PlatformBannerColumn[];
  };
  createForm: {
    url: string;
    title: string;
    formAction: string;
    fields: PlatformFormField[];
  };
};

export type PlatformModuleKey =
  | "banner"
  | "flight"
  | "placement"
  | "campaign"
  | "report";
