import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks'
import { 
  calculateEstimate, 
  updateHomepageEstimateData,
  selectHomepageSession,
  selectHomepageEstimateData,
  selectHomepageEstimate,
  selectIsCalculatingEstimate,
  transferHomepageToWorkflow,
  setShowUploadModal
} from '@/lib/store/slices/uploadSlice'
import { selectAvailableMaterials, selectActiveLocations } from '@/lib/store/slices/appConfigSlice'
import { HomepageEstimateData } from '@/lib/store/slices/uploadSlice'
import { useUpload } from '@/lib/providers/UploadProvider'

export const useHomepageEstimate = () => {
  const dispatch = useAppDispatch()
  const { openUploadModal } = useUpload()
  
  const estimateData = useAppSelector(selectHomepageEstimateData)
  const estimate = useAppSelector(selectHomepageEstimate)
  const isCalculating = useAppSelector(selectIsCalculatingEstimate)
  const homepageSession = useAppSelector(selectHomepageSession)
  
  const materials = useAppSelector(selectAvailableMaterials)
  const locations = useAppSelector(selectActiveLocations)

  // Auto-calculate estimate when data changes
  useEffect(() => {
    if (
      estimateData.material && 
      estimateData.location && 
      estimateData.quality &&
      estimateData.quantity > 0 &&
      materials.length > 0 &&
      locations.length > 0
    ) {
      const timer = setTimeout(() => {
        dispatch(calculateEstimate(estimateData))
      }, 500) // Debounce the calculation

      return () => clearTimeout(timer)
    }
  }, [dispatch, estimateData, materials.length, locations.length])

  const updateEstimateData = useCallback((updates: Partial<HomepageEstimateData>) => {
    dispatch(updateHomepageEstimateData(updates))
  }, [dispatch])

  const proceedToDetailedQuote = useCallback(() => {
    // Transfer homepage data to workflow and open modal for quote generation
    dispatch(transferHomepageToWorkflow())
    openUploadModal()
  }, [dispatch, openUploadModal])

  const proceedToOrder = useCallback(() => {
    // Transfer homepage data to workflow and open modal for order flow
    dispatch(transferHomepageToWorkflow())
    openUploadModal()
  }, [dispatch, openUploadModal])

  return {
    estimateData,
    estimate,
    isCalculating,
    isHomepageSession: homepageSession.isHomepageSession,
    updateEstimateData,
    proceedToDetailedQuote,
    proceedToOrder,
    hasValidEstimate: estimate !== null && !isCalculating
  }
}
