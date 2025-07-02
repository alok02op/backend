export const toggleLike = async ({ model, field, value, userId }) => {
    try {
        const query = { [field]: value, likedBy: userId };
        const existingLike = await model.findOne(query);
    
        if (existingLike) {
            await existingLike.deleteOne();
            return { action: "unliked", like: existingLike };
        }
    
        const newLike = await model.create({ ...query });
        return { action: "liked", like: newLike };
    } catch (error) {
        console.log("Error while toggling like", error);
    }
};
