// src/client/pages/ContactUsPage.jsx
import React, { useState } from 'react';
import { sendContactFormEmail } from 'wasp/client/operations';

export const ContactUsPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    priority: 'Normal'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      console.log('[ContactPage] Submitting contact form...');
      
      const result = await sendContactFormEmail(formData);
      
      if (result.success) {
        setSubmitResult({
          type: 'success',
          message: `Thank you for contacting us! We've received your message and will respond within 24 hours. Your support ticket ID is #${result.ticketId}.`,
          ticketId: result.ticketId
        });
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
          priority: 'Normal'
        });
        
        console.log('[ContactPage] Contact form submitted successfully. Ticket ID:', result.ticketId);
      } else {
        setSubmitResult({
          type: 'error',
          message: result.error || 'Failed to send your message. Please try again.'
        });
        console.error('[ContactPage] Contact form submission failed:', result.error);
      }
    } catch (error) {
      console.error('[ContactPage] Error submitting contact form:', error);
      setSubmitResult({
        type: 'error',
        message: 'An unexpected error occurred. Please try again later.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-5xl mb-4">🌱</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Get in Touch</h1>
          <p className="text-xl md:text-2xl text-emerald-100">
            Have questions about plant care? Need help with Botani-Buddy? We're here to help!
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          
          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="text-green-600 mr-3">🌿</span>
                Contact Information
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4 p-6 bg-white rounded-lg shadow-md">
                  <div className="text-2xl">📧</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Email Support</h3>
                    <p className="text-gray-600">General inquiries and support</p>
                    <a href="mailto:admin@botani-buddy.us" className="text-green-600 hover:text-green-700 font-medium">
                      admin@botani-buddy.us
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-6 bg-white rounded-lg shadow-md">
                  <div className="text-2xl">👨‍💼</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Direct Contact</h3>
                    <p className="text-gray-600">Reach out to our founder</p>
                    <a href="mailto:bradley@botani-buddy.us" className="text-green-600 hover:text-green-700 font-medium">
                      bradley@botani-buddy.us
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-6 bg-white rounded-lg shadow-md">
                  <div className="text-2xl">⏰</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Response Time</h3>
                    <p className="text-gray-600">We typically respond within 24 hours</p>
                    <p className="text-sm text-gray-500 mt-1">Monday - Friday, 9 AM - 5 PM EST</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-green-600 mr-2">💡</span>
                Quick Help
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <strong className="text-gray-900">Plant Identification:</strong>
                  <span className="text-gray-600 ml-2">Ask Botani-Buddy to identify your plant with a description</span>
                </div>
                <div>
                  <strong className="text-gray-900">Care Instructions:</strong>
                  <span className="text-gray-600 ml-2">Get personalized care advice for your specific plants</span>
                </div>
                <div>
                  <strong className="text-gray-900">Account Issues:</strong>
                  <span className="text-gray-600 ml-2">Use the form to report login or subscription problems</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="text-green-600 mr-3">📝</span>
              Send Us a Message
            </h2>

            {/* Success/Error Message */}
            {submitResult && (
              <div className={`mb-6 p-4 rounded-lg ${
                submitResult.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <div className="flex items-start">
                  <span className="text-xl mr-3">
                    {submitResult.type === 'success' ? '✅' : '❌'}
                  </span>
                  <div>
                    <p>{submitResult.message}</p>
                    {submitResult.ticketId && (
                      <p className="mt-2 font-medium">
                        Please save your ticket ID: <span className="bg-green-100 px-2 py-1 rounded text-green-900">#{submitResult.ticketId}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name and Email Row */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Your full name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="your@email.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>
              </div>

              {/* Phone and Priority Row */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                    Priority Level
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  >
                    <option value="Low">Low - General Question</option>
                    <option value="Normal">Normal - Standard Support</option>
                    <option value="High">High - Urgent Issue</option>
                    <option value="Critical">Critical - System Problem</option>
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                    errors.subject ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Brief description of your inquiry"
                />
                {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  value={formData.message}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-vertical ${
                    errors.message ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Please provide as much detail as possible about your question or issue..."
                />
                {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
                <p className="mt-1 text-sm text-gray-500">
                  Minimum 10 characters. Current: {formData.message.length}
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-green-700 hover:to-emerald-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending Message...</span>
                  </>
                ) : (
                  <>
                    <span>🌱</span>
                    <span>Send Message</span>
                  </>
                )}
              </button>

              <p className="text-sm text-gray-500 text-center">
                By submitting this form, you'll receive an automatic confirmation email with your support ticket ID.
              </p>
            </form>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              🌱 Need Immediate Plant Help?
            </h3>
            <p className="text-gray-700 mb-6">
              While you're waiting for our response, try asking Botani-Buddy directly! 
              Our AI assistant is available 24/7 to help with plant care questions.
            </p>
            <a
              href="/"
              className="inline-flex items-center space-x-2 bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
            >
              <span>💬</span>
              <span>Chat with Botani-Buddy Now</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};