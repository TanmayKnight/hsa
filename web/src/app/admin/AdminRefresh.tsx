'use client'
import { useState } from 'react'
import UploadForm from '@/components/admin/UploadForm'
import PDFList from '@/components/admin/PDFList'
import ScheduleManager from '@/components/admin/ScheduleManager'

export default function AdminRefresh() {
  const [refreshTick, setRefreshTick] = useState(0)

  return (
    <div className="space-y-8">
      <UploadForm onUploadDone={() => setRefreshTick(t => t + 1)} />
      <PDFList refreshTrigger={refreshTick} />
      <ScheduleManager />
    </div>
  )
}
