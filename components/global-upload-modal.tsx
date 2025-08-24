"use client"

import { useUpload } from '@/lib/providers/UploadProvider'
import { UploadWorkflowModal } from './upload-workflow-modal'

export function GlobalUploadModal() {
  const { isUploadModalOpen, closeUploadModal } = useUpload()

  return (
    <UploadWorkflowModal 
      isOpen={isUploadModalOpen} 
      onClose={closeUploadModal} 
    />
  )
}
