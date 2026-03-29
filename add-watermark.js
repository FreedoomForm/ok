const fs = require('fs');
const file = 'src/components/admin/AdminDashboardPage.tsx';
let c = fs.readFileSync(file, 'utf-8');

if (!c.includes('import { motion }')) {
  c = c.replace(/import { toast } from 'sonner'/, "import { toast } from 'sonner'\nimport { motion, AnimatePresence } from 'framer-motion'");
}

const watermarkRegex = /<div className=\"absolute top-8 right-8[^>]*>[\s\S]*?<CookingPot[^>]*>[\s\S]*?<\/div>/;
const animatedWatermark = `<motion.div 
                animate={{ 
                  y: [0, -20, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute top-10 right-10 opacity-5 dark:opacity-10 pointer-events-none"
              >
                <CookingPot className="w-64 h-64 text-gourmet-ink dark:text-dark-text" />
              </motion.div>`;

if (watermarkRegex.test(c)) {
  c = c.replace(watermarkRegex, animatedWatermark);
  console.log('Watermark replaced successfully');
} else {
  console.log('Watermark not found!');
  
  // just in case we need a fallback:
  if (c.includes('<motion.div') && c.includes('y: [0, -20, 0]')) {
    console.log('Watermark already replaced');
  } else {
      console.log('Could not find watermark');
  }
}

fs.writeFileSync(file, c);
