(function (global) {
  var API_BASE = global.API_BASE || '';
  var __services = [];

  var SERVICE_DETAILS = {
    'architectural design': {
      title: 'Architectural Design',
      tagline: 'Designing spaces that inspire, perform, and endure.',
      description: 'Every exceptional building begins with a thoughtful design. Our architectural design service transforms your ideas into functional, aesthetically refined, and sustainable spaces tailored to your lifestyle, business, and investment goals. From concept development and space planning to detailed construction drawings, we create designs that balance creativity, practicality, regulatory compliance, and cost efficiency.',
      deliverables: [
        'Concept Design',
        'Site Analysis',
        'Floor Plans',
        'Building Elevations & Sections',
        'Working Drawings',
        'Building Permit Documentation',
        'Sustainable Design Solutions'
      ]
    },
    'interior design': {
      title: 'Interior Design',
      tagline: 'Creating interiors that reflect your vision and enhance everyday living.',
      description: 'We design interiors that combine beauty, comfort, and functionality. Whether residential, commercial, hospitality, or corporate, our interior solutions are carefully crafted to maximize space, improve user experience, and create environments that leave lasting impressions. Every detail—from layouts and finishes to lighting and furniture—is selected to complement your lifestyle and brand.',
      deliverables: [
        'Space Planning',
        'Furniture Layouts',
        'Material & Finish Selection',
        'Lighting Design',
        'Colour Consultation',
        'Custom Joinery',
        'Interior Styling'
      ]
    },
    'master planning': {
      title: 'Master Planning',
      tagline: 'Building smarter communities through strategic planning.',
      description: 'Successful developments begin with a comprehensive master plan. We develop integrated planning solutions for residential estates, commercial developments, institutional campuses, and mixed-use projects that optimize land use, infrastructure, accessibility, sustainability, and long-term value while ensuring compliance with planning regulations.',
      deliverables: [
        'Land Use Planning',
        'Infrastructure Planning',
        'Estate Planning',
        'Mixed-Use Development Planning',
        'Urban Design',
        'Phased Development Strategies',
        'Planning Approval Support'
      ]
    },
    'feasibility study': {
      title: 'Feasibility Study',
      tagline: 'Making informed investment decisions before construction begins.',
      description: 'Our feasibility studies evaluate the technical, financial, environmental, and regulatory viability of your proposed project. By identifying opportunities, constraints, risks, and estimated costs early, we help clients make confident investment decisions and reduce costly changes during construction.',
      deliverables: [
        'Site Analysis',
        'Market Evaluation',
        'Cost Estimates',
        'Financial Viability',
        'Regulatory Review',
        'Environmental Considerations',
        'Risk Assessment'
      ]
    },
    'project management': {
      title: 'Project Management',
      tagline: 'Delivering projects on time, within budget, and to the highest standards.',
      description: 'From project initiation to final handover, our project management team coordinates every aspect of the construction process. We oversee consultants, contractors, schedules, budgets, procurement, and communication to ensure your project progresses efficiently while maintaining quality and accountability.',
      deliverables: [
        'Project Planning',
        'Budget Management',
        'Programme Scheduling',
        'Consultant Coordination',
        'Procurement Support',
        'Quality Assurance',
        'Progress Reporting'
      ]
    },
    'construction supervision': {
      title: 'Construction Supervision',
      tagline: 'Protecting your investment through professional site oversight.',
      description: 'Our construction supervision service ensures that every stage of construction adheres to approved drawings, technical specifications, safety standards, and quality requirements. Through regular site inspections and contractor coordination, we help minimise defects, control costs, and ensure successful project delivery.',
      deliverables: [
        'Site Inspections',
        'Quality Control',
        'Contractor Coordination',
        'Materials Verification',
        'Progress Monitoring',
        'Technical Compliance',
        'Defects Management'
      ]
    },
    'renovation & extension': {
      title: 'Renovation & Extension',
      tagline: 'Reimagining existing spaces for modern living and future growth.',
      description: 'Whether upgrading a home, expanding commercial premises, or restoring an aging building, we deliver renovation and extension solutions that improve functionality, appearance, and property value while preserving the character of the existing structure wherever appropriate.',
      deliverables: [
        'Building Renovations',
        'Home Extensions',
        'Commercial Refurbishments',
        'Space Reconfiguration',
        'Structural Alterations',
        'Building Upgrades',
        'Adaptive Reuse Solutions'
      ]
    },
    '3d visualization': {
      title: '3D Visualization',
      tagline: 'Experience your project before construction begins.',
      description: 'Our high-quality 3D visualizations transform architectural concepts into realistic images and immersive presentations. These visual tools help clients confidently evaluate designs, materials, lighting, and spatial relationships before construction, enabling faster approvals and informed decision-making.',
      deliverables: [
        'Photorealistic Renders',
        'Interior Visualizations',
        'Exterior Visualizations',
        'Walkthrough Animations',
        'Virtual Presentations',
        'Concept Illustrations',
        'Marketing Visuals'
      ]
    },
    'authority approvals': {
      title: 'Authority Approvals',
      tagline: 'Simplifying the approval process with complete regulatory support.',
      description: 'Navigating building approvals can be complex. We manage the preparation, coordination, and submission of all required documentation to relevant authorities, helping ensure your project complies with statutory regulations and progresses without unnecessary delays.',
      deliverables: [
        'Building Permit Applications',
        'County Approvals',
        'Planning Compliance',
        'Documentation Preparation',
        'Consultant Coordination',
        'Regulatory Liaison',
        'Submission Management'
      ]
    },
    'tender documentation': {
      title: 'Tender Documentation',
      tagline: 'Preparing accurate documentation for successful project execution.',
      description: 'Comprehensive tender documentation is essential for competitive pricing and quality construction. We prepare clear, detailed, and coordinated tender packages that enable contractors to provide accurate quotations while reducing ambiguities and construction risks.',
      deliverables: [
        'Technical Specifications',
        'Construction Drawings',
        'Bills of Quantities Coordination',
        'Tender Packages',
        'Contractor Information',
        'Procurement Documentation',
        'Contract Documentation'
      ]
    }
  };

  function defaults() {
    return [];
  }

  global.loadWebsiteServices = function () {
    return fetch(API_BASE + '/api/services')
      .then(function (r) {
        if (!r.ok) throw new Error('bad response');
        return r.json();
      })
      .then(function (list) {
        __services = list || [];
        return __services;
      })
      .catch(function () {
        __services = defaults();
        return __services;
      });
  };

  global.getWebsiteServices = function () {
    return __services;
  };

  global.getServiceDetails = function (filter) {
    if (!filter) return null;
    var key = String(filter).toLowerCase().trim();
    return SERVICE_DETAILS[key] || null;
  };

  global.getAllServiceDetails = function () {
    return SERVICE_DETAILS;
  };

  global.setWebsiteServices = function (services) {
    var token = global.sessionStorage && global.sessionStorage.getItem('authToken');
    return fetch(API_BASE + '/api/admin/services', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (token || '')
      },
      body: JSON.stringify(services)
    }).then(function (r) {
      if (!r.ok) throw new Error('Save failed');
      __services = services;
    });
  };

  global.SERVICE_CATEGORIES = ['Architectural Design', 'Interior Design', 'Master Planning', 'Feasibility Study', 'Project Management', 'Construction Supervision', 'Renovation & Extension', '3D Visualization', 'Authority Approvals', 'Tender Documentation'];
  global.SERVICE_DETAILS = SERVICE_DETAILS;
})(typeof window !== 'undefined' ? window : this);
