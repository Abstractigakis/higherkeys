import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <div className="prose prose-slate dark:prose-invert">
        <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
        <p className="mb-4">
          By accessing our website, you are agreeing to be bound by these terms
          of service, all applicable laws and regulations, and agree that you
          are responsible for compliance with any applicable local laws.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-4">1. Use License</h2>
        <p className="mb-4">
          Permission is granted to temporarily download one copy of the
          materials (information or software) on our website for personal,
          non-commercial transitory viewing only.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-4">2. Disclaimer</h2>
        <p className="mb-4">
          The materials on our website are provided on an 'as is' basis. We make
          no warranties, expressed or implied, and hereby disclaims and negates
          all other warranties including, without limitation, implied warranties
          or conditions of merchantability, fitness for a particular purpose, or
          non-infringement of intellectual property or other violation of
          rights.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-4">3. Limitations</h2>
        <p className="mb-4">
          In no event shall we or our suppliers be liable for any damages
          (including, without limitation, damages for loss of data or profit, or
          due to business interruption) arising out of the use or inability to
          use the materials on our website.
        </p>
      </div>
      <div className="mt-8">
        <Link href="/" className="text-blue-600 hover:underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
