import type { Meta, StoryObj } from '@storybook/react';
import { DeleteDialog } from './DeleteDialog';

const meta: Meta<typeof DeleteDialog> = {
  title: 'Components/DeleteDialog',
  component: DeleteDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DeleteDialog>;

const noopDelete = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
};

export const Default: Story = {
  args: {
    deleteFunction: noopDelete,
    isLoading: false,
  },
};

export const CustomTitle: Story = {
  args: {
    title: 'Are you sure you want to revoke this grant?',
    deleteFunction: noopDelete,
    isLoading: false,
  },
};

export const CustomButton: Story = {
  args: {
    deleteFunction: noopDelete,
    isLoading: false,
    buttonElement: {
      text: 'Remove Member',
      icon: null,
      styleClass: 'bg-red-100 text-red-700 hover:bg-red-200',
    },
  },
};

export const Loading: Story = {
  args: {
    deleteFunction: noopDelete,
    isLoading: true,
    buttonElement: {
      text: 'Delete Item',
      icon: null,
      styleClass: 'bg-red-100 text-red-700',
    },
  },
};

export const DialogOpen: Story = {
  args: {
    title: 'Delete this project permanently?',
    deleteFunction: noopDelete,
    isLoading: false,
    externalIsOpen: true,
    externalSetIsOpen: () => {},
    buttonElement: null,
  },
};

export const DialogOpenLoading: Story = {
  args: {
    title: 'Deleting in progress...',
    deleteFunction: noopDelete,
    isLoading: true,
    externalIsOpen: true,
    externalSetIsOpen: () => {},
    buttonElement: null,
  },
};
