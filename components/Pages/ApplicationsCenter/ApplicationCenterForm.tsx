"use client";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useState, useEffect } from "react";
import { cn } from "@/utilities/tailwind";
import { PlusIcon, TrashIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import {
  useCreateTenantConfig,
  useUpdateTenantConfig,
  useTenantConfig,
} from "@/hooks/useTenantConfigs";
import { useCommunityDetails } from "@/hooks/useCommunityDetails";

// Zod schemas based on the tenant config model
const themeColorsSchema = z.object({
  primary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  primaryDark: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  primaryLight: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  secondary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  background: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  foreground: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  buttontext: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  border: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  success: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  warning: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  error: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
});

const themeConfigSchema = z.object({
  colors: themeColorsSchema,
  fonts: z.object({
    sans: z.array(z.string()).min(1, "At least one font required"),
    mono: z.array(z.string()).min(1, "At least one font required"),
  }),
  radius: z.object({
    small: z.string(),
    medium: z.string(),
    large: z.string(),
  }),
});

const themeSchema = z.object({
  light: themeConfigSchema,
  dark: themeConfigSchema,
});

const assetsSchema = z.object({
  logo: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: "Must be a valid URL",
  }),
  logoDark: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: "Must be a valid URL",
  }),
  favicon: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: "Must be a valid URL",
  }),
  ogImage: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: "Must be a valid URL",
  }),
});

const navItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    label: z.string().min(1, "Label is required"),
    href: z.string().optional(),
    isExternal: z.boolean().optional(),
    items: z.array(navItemSchema).optional(),
  })
);

const navigationSchema = z.object({
  header: z.object({
    logo: z.object({
      className: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }).optional(),
    title: z.string().optional(),
    shouldHaveTitle: z.boolean().optional(),
    poweredBy: z.boolean().optional(),
  }).optional(),
  items: z.array(navItemSchema),
  socialLinks: z.object({
    twitter: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
      message: "Must be a valid URL",
    }),
    discord: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
      message: "Must be a valid URL",
    }),
    github: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
      message: "Must be a valid URL",
    }),
    docs: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
      message: "Must be a valid URL",
    }),
    telegram: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
      message: "Must be a valid URL",
    }),
    paragraph: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
      message: "Must be a valid URL",
    }),
  }).optional(),
});

const contentSchema = z.object({
  subtitle: z.string().optional(),
  openFundingRoundsTitle: z.string().optional(),
});

const domainsSchema = z.object({
  stagingUrl: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: "Must be a valid URL",
  }),
  prodUrl: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: "Must be a valid URL",
  }),
  isActive: z.boolean(),
}).optional();


const tenantConfigFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  theme: themeSchema,
  assets: assetsSchema,
  navigation: navigationSchema,
  content: contentSchema,
  domains: domainsSchema,
});

type TenantConfigFormData = z.infer<typeof tenantConfigFormSchema>;

interface ApplicationCenterFormProps {
  communityId: string;
  onSuccess: () => void;
  onCancel: () => void;
  tenantId?: string; // If provided, we're in edit mode
}

// Section component for collapsible sections
const Section = ({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      <ChevronDownIcon
        className={cn(
          "w-5 h-5 text-gray-500 transition-transform",
          isOpen && "transform rotate-180"
        )}
      />
    </button>
    {isOpen && <div className="p-4 space-y-4">{children}</div>}
  </div>
);

// Input component with label and error
const InputField = ({
  label,
  error,
  required,
  ...props
}: {
  label: string;
  error?: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      {...props}
      className={cn(
        "w-full px-3 py-2 border rounded-md bg-white dark:bg-zinc-900 text-gray-900 dark:text-white",
        error
          ? "border-red-500 focus:ring-red-500"
          : "border-gray-300 dark:border-gray-600 focus:ring-primary-500",
        "focus:outline-none focus:ring-2"
      )}
    />
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
);

// Navigation Item Editor component (supports nested items)
const NavItemEditor = ({
  index,
  register,
  control,
  errors,
  onRemove,
  basePath = "navigation.items",
}: {
  index: number;
  register: any;
  control: any;
  errors: any;
  onRemove: () => void;
  basePath?: string;
}) => {
  const { fields: subItemFields, append: appendSubItem, remove: removeSubItem } = useFieldArray({
    control,
    name: `${basePath}.${index}.items`,
  });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
      <div className="flex gap-2 items-start p-3 bg-gray-50 dark:bg-zinc-800/50">
        <div className="flex-1 space-y-2">
          <InputField
            label="Label"
            {...register(`${basePath}.${index}.label`)}
            error={((errors.navigation?.items as any)?.[index] as any)?.label?.message}
            placeholder="Home"
          />
          <InputField
            label="URL (optional for dropdowns)"
            {...register(`${basePath}.${index}.href`)}
            error={((errors.navigation?.items as any)?.[index] as any)?.href?.message}
            placeholder="/home or https://example.com"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register(`${basePath}.${index}.isExternal`)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              External Link
            </span>
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => appendSubItem({ label: "", href: "", isExternal: false })}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
            title="Add Sub-item"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
            title="Remove Item"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nested sub-items */}
      {subItemFields.length > 0 && (
        <div className="pl-6 pr-3 pb-3 pt-2 space-y-2 bg-gray-100 dark:bg-zinc-900/30">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Sub-items (dropdown menu):
          </p>
          {subItemFields.map((subField, subIndex) => (
            <div
              key={subField.id}
              className="flex gap-2 items-start p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded"
            >
              <div className="flex-1 space-y-2">
                <InputField
                  label="Label"
                  {...register(`${basePath}.${index}.items.${subIndex}.label`)}
                  placeholder="Sub-item"
                />
                <InputField
                  label="URL"
                  {...register(`${basePath}.${index}.items.${subIndex}.href`)}
                  placeholder="https://example.com"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register(`${basePath}.${index}.items.${subIndex}.isExternal`)}
                    className="rounded"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    External
                  </span>
                </label>
              </div>
              <button
                type="button"
                onClick={() => removeSubItem(subIndex)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
              >
                <TrashIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ApplicationCenterForm = ({
  communityId,
  onSuccess,
  onCancel,
  tenantId,
}: ApplicationCenterFormProps) => {
  const { address } = useAccount();
  const createTenantConfig = useCreateTenantConfig();
  const updateTenantConfig = useUpdateTenantConfig();
  const { data: community } = useCommunityDetails(communityId);

  // Fetch existing tenant config if in edit mode
  const { data: existingTenant, isLoading: isLoadingTenant } = useTenantConfig(
    tenantId || "",
    !!tenantId
  );

  const isEditMode = !!tenantId;

  // Track which theme mode (light/dark) is being edited
  const [editingThemeMode, setEditingThemeMode] = useState<"light" | "dark">("light");

  const [openSections, setOpenSections] = useState({
    basic: true,
    theme: true,
    assets: true,
    navigation: true,
    content: true,
    domains: true,
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TenantConfigFormData>({
    resolver: zodResolver(tenantConfigFormSchema),
    defaultValues: {
      name: "",
      theme: {
        light: {
          colors: {
            primary: "#FF0420",
            primaryDark: "#CC0319",
            primaryLight: "#FF4D5A",
            secondary: "#00A3FF",
            background: "#FFFFFF",
            foreground: "#000000",
            buttontext: "#FFFFFF",
            border: "#E5E7EB",
            success: "#10B981",
            warning: "#F59E0B",
            error: "#EF4444",
          },
          fonts: {
            sans: ["Inter", "sans-serif"],
            mono: ["Fira Code", "monospace"],
          },
          radius: {
            small: "4px",
            medium: "8px",
            large: "12px",
          },
        },
        dark: {
          colors: {
            primary: "#FF0420",
            primaryDark: "#CC0319",
            primaryLight: "#FF4D5A",
            secondary: "#00A3FF",
            background: "#1F2937",
            foreground: "#F9FAFB",
            buttontext: "#FFFFFF",
            border: "#374151",
            success: "#10B981",
            warning: "#F59E0B",
            error: "#EF4444",
          },
          fonts: {
            sans: ["Inter", "sans-serif"],
            mono: ["Fira Code", "monospace"],
          },
          radius: {
            small: "4px",
            medium: "8px",
            large: "12px",
          },
        },
      },
      assets: {
        logo: "",
        logoDark: "",
        favicon: "",
        ogImage: "",
      },
      navigation: {
        items: [],
        socialLinks: {},
      },
      content: {
        subtitle: "",
        openFundingRoundsTitle: "Open Funding Rounds",
      },
      domains: {
        stagingUrl: "",
        prodUrl: "",
        isActive: false,
      },
    },
  });

  const {
    fields: navItemFields,
    append: appendNavItem,
    remove: removeNavItem,
  } = useFieldArray({
    control,
    name: "navigation.items",
  });


  // Pre-populate form with community data (create mode only)
  useEffect(() => {
    if (community && !isEditMode) {
      // Set Name to community name
      if (community.details?.data?.name) {
        setValue("name", community.details.data.name);
      }

      // Set Logo URL from community details
      if (community.details?.data?.imageURL) {
        setValue("assets.logo", community.details.data.imageURL);
      }
    }
  }, [community, communityId, setValue, isEditMode]);

  // Pre-populate form with existing tenant data (edit mode)
  useEffect(() => {
    if (existingTenant && isEditMode) {
      // Use reset() instead of setValue() to properly sync useFieldArray
      reset({
        name: existingTenant.name,
        theme: existingTenant.theme || {
          light: {
            colors: {
              primary: "#FF0420",
              primaryDark: "#CC0319",
              primaryLight: "#FF4D5A",
              secondary: "#00A3FF",
              background: "#FFFFFF",
              foreground: "#000000",
              buttontext: "#FFFFFF",
              border: "#E5E7EB",
              success: "#10B981",
              warning: "#F59E0B",
              error: "#EF4444",
            },
            fonts: {
              sans: ["Inter", "sans-serif"],
              mono: ["Fira Code", "monospace"],
            },
            radius: {
              small: "4px",
              medium: "8px",
              large: "12px",
            },
          },
          dark: {
            colors: {
              primary: "#FF0420",
              primaryDark: "#CC0319",
              primaryLight: "#FF4D5A",
              secondary: "#00A3FF",
              background: "#1F2937",
              foreground: "#F9FAFB",
              buttontext: "#FFFFFF",
              border: "#374151",
              success: "#10B981",
              warning: "#F59E0B",
              error: "#EF4444",
            },
            fonts: {
              sans: ["Inter", "sans-serif"],
              mono: ["Fira Code", "monospace"],
            },
            radius: {
              small: "4px",
              medium: "8px",
              large: "12px",
            },
          },
        },
        assets: existingTenant.assets || {
          logo: "",
          logoDark: "",
          favicon: "",
          ogImage: "",
        },
        navigation: existingTenant.navigation || {
          items: [],
          socialLinks: {},
        },
        content: existingTenant.content || {
          subtitle: "",
          openFundingRoundsTitle: "Open Funding Rounds",
        },
        domains: {
          stagingUrl: existingTenant.domains?.stagingUrl || "",
          prodUrl: existingTenant.domains?.prodUrl || "",
          isActive: existingTenant.domains?.isActive || false,
        },
      });
    }
  }, [existingTenant, isEditMode, reset]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const onSubmit = async (data: TenantConfigFormData) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (isEditMode && existingTenant) {
      // Update mode
      const updatePayload = {
        slug: existingTenant.slug, // Use slug as unique identifier
        ...data,
      };

      updateTenantConfig.mutate(updatePayload, {
        onSuccess: () => {
          toast.success("Application center updated successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error updating tenant config:", error);
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to update application center"
          );
        },
      });
    } else {
      // Create mode
      const createPayload = {
        ...data,
        slug: communityId, // Use community slug as tenant slug
        chainId: 10, // Default to Optimism mainnet
        communityUID: communityId,
        createdBy: address,
      };

      createTenantConfig.mutate(createPayload, {
        onSuccess: () => {
          toast.success("Application center created successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error creating tenant config:", error);
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to create application center"
          );
        },
      });
    }
  };

  if (isLoadingTenant) {
    return (
      <div className="flex w-full items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
      {/* Basic Information */}
      <Section
        title="Basic Information"
        isOpen={openSections.basic}
        onToggle={() => toggleSection("basic")}
      >
        <div className="space-y-4">
          <InputField
            label="Name"
            required
            {...register("name")}
            error={errors.name?.message}
            placeholder="Optimism Grants"
          />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The application center will use your community&apos;s slug as its unique identifier.
          </p>
        </div>
      </Section>

      {/* Theme Configuration */}
      <Section
        title="Theme Configuration"
        isOpen={openSections.theme}
        onToggle={() => toggleSection("theme")}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Editing Theme Mode
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingThemeMode("light")}
                className={cn(
                  "flex-1 px-4 py-2 rounded-md font-medium transition-colors",
                  editingThemeMode === "light"
                    ? "bg-primary-500 text-white"
                    : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600"
                )}
              >
                Light Theme
              </button>
              <button
                type="button"
                onClick={() => setEditingThemeMode("dark")}
                className={cn(
                  "flex-1 px-4 py-2 rounded-md font-medium transition-colors",
                  editingThemeMode === "dark"
                    ? "bg-primary-500 text-white"
                    : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600"
                )}
              >
                Dark Theme
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Configure colors for {editingThemeMode} mode. Both light and dark themes will be saved.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" key={editingThemeMode}>
            {[
              { name: "primary", label: "Primary Color" },
              { name: "primaryDark", label: "Primary Dark" },
              { name: "primaryLight", label: "Primary Light" },
              { name: "secondary", label: "Secondary Color" },
              { name: "background", label: "Background Color" },
              { name: "foreground", label: "Foreground Color" },
              { name: "buttontext", label: "Button Text Color" },
              { name: "border", label: "Border Color" },
              { name: "success", label: "Success Color" },
              { name: "warning", label: "Warning Color" },
              { name: "error", label: "Error Color" },
            ].map(({ name, label }) => (
              <Controller
                key={`${editingThemeMode}-${name}`}
                name={`theme.${editingThemeMode}.colors.${name}` as any}
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {label}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="#000000"
                      />
                    </div>
                    {(errors.theme?.[editingThemeMode]?.colors as any)?.[name] && (
                      <p className="text-red-500 text-sm mt-1">
                        {((errors.theme?.[editingThemeMode]?.colors as any)?.[name] as any)?.message}
                      </p>
                    )}
                  </div>
                )}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Assets */}
      <Section
        title="Assets"
        isOpen={openSections.assets}
        onToggle={() => toggleSection("assets")}
      >
        <div className="space-y-4">
          <InputField
            label="Logo URL"
            {...register("assets.logo")}
            error={errors.assets?.logo?.message}
            placeholder="https://cdn.example.com/logo.png"
          />
          <InputField
            label="Logo Dark URL"
            {...register("assets.logoDark")}
            error={errors.assets?.logoDark?.message}
            placeholder="https://cdn.example.com/logo-dark.png"
          />
          <InputField
            label="Favicon URL"
            {...register("assets.favicon")}
            error={errors.assets?.favicon?.message}
            placeholder="https://cdn.example.com/favicon.ico"
          />
          <InputField
            label="OG Image URL"
            {...register("assets.ogImage")}
            error={errors.assets?.ogImage?.message}
            placeholder="https://cdn.example.com/og-image.png"
          />
        </div>
      </Section>

      {/* Navigation */}
      <Section
        title="Navigation"
        isOpen={openSections.navigation}
        onToggle={() => toggleSection("navigation")}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Menu Items
            </label>
            <Button
              type="button"
              variant="secondary"
              className="text-sm"
              onClick={() =>
                appendNavItem({ label: "", href: "", isExternal: false })
              }
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>

          {navItemFields.map((field, index) => (
            <NavItemEditor
              key={field.id}
              index={index}
              register={register}
              control={control}
              errors={errors}
              onRemove={() => removeNavItem(index)}
            />
          ))}

          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Social Links
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Twitter"
                {...register("navigation.socialLinks.twitter")}
                error={errors.navigation?.socialLinks?.twitter?.message}
                placeholder="https://twitter.com/..."
              />
              <InputField
                label="Discord"
                {...register("navigation.socialLinks.discord")}
                error={errors.navigation?.socialLinks?.discord?.message}
                placeholder="https://discord.gg/..."
              />
              <InputField
                label="GitHub"
                {...register("navigation.socialLinks.github")}
                error={errors.navigation?.socialLinks?.github?.message}
                placeholder="https://github.com/..."
              />
              <InputField
                label="Docs"
                {...register("navigation.socialLinks.docs")}
                error={errors.navigation?.socialLinks?.docs?.message}
                placeholder="https://docs.example.com"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Content */}
      <Section
        title="Content"
        isOpen={openSections.content}
        onToggle={() => toggleSection("content")}
      >
        <div className="space-y-4">
          <InputField
            label="Subtitle"
            {...register("content.subtitle")}
            error={errors.content?.subtitle?.message}
            placeholder="Community Funding Platform"
          />
          <InputField
            label="Open Funding Rounds Title"
            {...register("content.openFundingRoundsTitle")}
            error={errors.content?.openFundingRoundsTitle?.message}
            placeholder="Open Funding Rounds"
          />
        </div>
      </Section>

      {/* Domain Configuration */}
      <Section
        title="Domain Configuration"
        isOpen={openSections.domains}
        onToggle={() => toggleSection("domains")}
      >
        <div className="space-y-4">
          <InputField
            label="Staging URL (Optional)"
            {...register("domains.stagingUrl")}
            error={errors.domains?.stagingUrl?.message}
            placeholder="https://staging.example.io"
          />

          <InputField
            label="Production URL (Optional)"
            {...register("domains.prodUrl")}
            error={errors.domains?.prodUrl?.message}
            placeholder="https://grants.example.io"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register("domains.isActive")}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Domain is active
            </label>
          </div>
        </div>
      </Section>

      {/* Form Actions */}
      <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="submit"
          disabled={createTenantConfig.isPending || updateTenantConfig.isPending}
          className="flex-1 md:flex-none"
        >
          {createTenantConfig.isPending || updateTenantConfig.isPending
            ? isEditMode
              ? "Updating..."
              : "Creating..."
            : isEditMode
            ? "Update Application Center"
            : "Create Application Center"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={createTenantConfig.isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};
