export const fieldTypes = [
  {
    type: "section_header" as const,
    label: "Section Header",
    icon: "🔖",
    description: "Visual heading to group related fields",
  },
  {
    type: "email" as const,
    label: "Email",
    icon: "📧",
    description: "Email address input",
  },
  {
    type: "karma_profile_link" as const,
    label: "Karma profile link",
    icon: "🔍",
    description: "Search and select an existing Karma project profile",
  },
  {
    type: "text" as const,
    label: "Text Input",
    icon: "📝",
    description: "Single line text input",
  },
  {
    type: "textarea" as const,
    label: "Textarea",
    icon: "📄",
    description: "Multi-line text input",
  },
  {
    type: "select" as const,
    label: "Dropdown",
    icon: "📋",
    description: "Select from options",
  },
  {
    type: "radio" as const,
    label: "Radio Button",
    icon: "🔘",
    description: "Choose one option",
  },
  {
    type: "checkbox" as const,
    label: "Checkbox",
    icon: "☑️",
    description: "Choose multiple options",
  },
  {
    type: "number" as const,
    label: "Number",
    icon: "🔢",
    description: "Numeric input",
  },
  {
    type: "url" as const,
    label: "URL",
    icon: "🔗",
    description: "Website URL input",
  },
  {
    type: "date" as const,
    label: "Date",
    icon: "📅",
    description: "Date picker",
  },
  {
    type: "milestone" as const,
    label: "Milestones",
    icon: "🎯",
    description:
      "Dynamic milestone management with title, description, due dates, funding requested, and completion criteria",
  },
  {
    type: "metric" as const,
    label: "Metrics",
    icon: "📊",
    description: "Repeatable metrics, each with a data source, how it's measured, and a target",
  },
];
