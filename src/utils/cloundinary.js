import {v2 as cloudinary} from 'cloudinary';
          
cloudinary.config({ 
  cloud_name: process.env.CLOUNDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUNDINARY_API_KEY,
  api_secret: process.env.CLOUNDINARY_API_SECRET 
});

const uploadOnCloudinary = async function(localFilePath){
    try {
        if(!localFilePath) return null
    const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        console.log("File is upload Successfully on cloundinary", response.url)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally save temp file as upload opertion faild
        return null;
    }
}

export { uploadOnCloudinary}