import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface CreateTrackModalProps {
  show: boolean;
  onClose: () => void;
  track: {
    name: string;
    description: string;
  };
  setTrack: (track: { name: string; description: string }) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const CreateTrackModal = ({
  show,
  onClose,
  track,
  setTrack,
  onSubmit,
  isSubmitting,
}: CreateTrackModalProps) => {
  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    Create New Track
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="space-y-4 mt-4">
                  <div>
                    <label
                      htmlFor="trackName"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Track Name
                    </label>
                    <input
                      id="trackName"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-zinc-700 dark:text-white"
                      value={track.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setTrack({ ...track, name: e.target.value })
                      }
                      placeholder="Enter track name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="trackDescription"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="trackDescription"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-zinc-700 dark:text-white"
                      value={track.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setTrack({
                          ...track,
                          description: e.target.value,
                        })
                      }
                      placeholder="Enter track description"
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? <Spinner className="w-4 h-4 mr-2" /> : null}
                    Create Track
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
