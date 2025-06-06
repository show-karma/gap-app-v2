import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { Track } from "@/services/tracks";

interface EditTrackModalProps {
  show: boolean;
  onClose: () => void;
  selectedTrack: Track | null;
  setSelectedTrack: (track: Track) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const EditTrackModal = ({
  show,
  onClose,
  selectedTrack,
  setSelectedTrack,
  onSubmit,
  isSubmitting,
}: EditTrackModalProps) => {
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
                    Edit Track
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                {selectedTrack && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <label
                        htmlFor="editTrackName"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Track Name
                      </label>
                      <input
                        id="editTrackName"
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-zinc-700 dark:text-white"
                        value={selectedTrack.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSelectedTrack({
                            ...selectedTrack,
                            name: e.target.value,
                          })
                        }
                        placeholder="Enter track name"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="editTrackDescription"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Description
                      </label>
                      <textarea
                        id="editTrackDescription"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-zinc-700 dark:text-white"
                        value={selectedTrack.description || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setSelectedTrack({
                            ...selectedTrack,
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
                      {isSubmitting ? (
                        <Spinner className="w-4 h-4 mr-2" />
                      ) : null}
                      Update Track
                    </Button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
