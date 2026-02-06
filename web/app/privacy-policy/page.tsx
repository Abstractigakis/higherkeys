import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-slate dark:prose-invert">
        <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
        <p className="mb-4">
          Your privacy is important to us. It is our policy to respect your
          privacy regarding any information we may collect from you across our
          website.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-4">
          1. Information We Collect
        </h2>
        <p className="mb-4">
          We only ask for personal information when we truly need it to provide
          a service to you. We collect it by fair and lawful means, with your
          knowledge and consent.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-4">
          2. Use of Information
        </h2>
        <p className="mb-4">
          We only retain collected information for as long as necessary to
          provide you with your requested service.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-4">3. Contact Us</h2>
        <p className="mb-4">
          If you have any questions about how we handle user data and personal
          information, feel free to contact us.
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
