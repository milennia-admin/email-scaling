interface ErrorMessageProps {
  title?: string
  message: string
}

export default function ErrorMessage({
  title = 'Something went wrong',
  message,
}: ErrorMessageProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5">
      <h3 className="text-sm font-semibold text-red-800 mb-1">{title}</h3>
      <p className="text-sm text-red-700">{message}</p>
    </div>
  )
}
